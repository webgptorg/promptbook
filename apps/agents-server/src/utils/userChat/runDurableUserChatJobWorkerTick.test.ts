import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ServerRecord } from '../serverRegistry';
import type { ServerContextRun } from '../../tools/mapRegisteredServerContexts';

jest.mock('../../tools/mapRegisteredServerContexts', () => ({
    mapRegisteredServerContexts: jest.fn(),
}));

jest.mock('../localChatRunner', () => ({
    processNextLocalUserChatJob: jest.fn(),
}));

jest.mock('./recoverExpiredRunningUserChatJobs', () => ({
    recoverExpiredRunningUserChatJobs: jest.fn(),
}));

import { mapRegisteredServerContexts } from '../../tools/mapRegisteredServerContexts';
import { processNextLocalUserChatJob } from '../localChatRunner';
import { recoverExpiredRunningUserChatJobs } from './recoverExpiredRunningUserChatJobs';
import { runDurableUserChatJobWorkerTick } from './runDurableUserChatJobWorkerTick';

const mapRegisteredServerContextsMock = mapRegisteredServerContexts as jest.MockedFunction<
    typeof mapRegisteredServerContexts
>;
const processNextLocalUserChatJobMock = processNextLocalUserChatJob as jest.MockedFunction<
    typeof processNextLocalUserChatJob
>;
const recoverExpiredRunningUserChatJobsMock = recoverExpiredRunningUserChatJobs as jest.MockedFunction<
    typeof recoverExpiredRunningUserChatJobs
>;

/**
 * Builds one fake registered server row for the fan-out mock.
 */
function createServerRecord(name: string): ServerRecord {
    return {
        id: 1,
        name,
        environment: 'PRODUCTION',
        domain: `${name}.example.com`,
        tablePrefix: `${name}_`,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };
}

/**
 * Runs the given callback once per fake server, mirroring `mapRegisteredServerContexts`.
 */
function mockServerContexts(servers: ReadonlyArray<ServerRecord | null>): void {
    mapRegisteredServerContextsMock.mockImplementation(async (callback) => {
        const serverRuns: Array<ServerContextRun<Awaited<ReturnType<typeof callback>>>> = [];
        for (const server of servers) {
            serverRuns.push({ server, value: await callback(server) });
        }
        return serverRuns;
    });
}

describe('runDurableUserChatJobWorkerTick', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        recoverExpiredRunningUserChatJobsMock.mockResolvedValue(0);
        processNextLocalUserChatJobMock.mockResolvedValue({ didMutate: false, outcome: 'waiting' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('scopes a preferred job to the current server without fanning out across the VPS', async () => {
        processNextLocalUserChatJobMock.mockResolvedValueOnce({ didMutate: true, outcome: 'queued' });

        const result = await runDurableUserChatJobWorkerTick({ preferredJobId: 'job-1' });

        expect(result).toEqual({ didMutate: true });
        expect(mapRegisteredServerContextsMock).not.toHaveBeenCalled();
        expect(recoverExpiredRunningUserChatJobsMock).toHaveBeenCalledTimes(1);
        expect(processNextLocalUserChatJobMock).toHaveBeenCalledTimes(1);
        expect(processNextLocalUserChatJobMock).toHaveBeenCalledWith({ preferredJobId: 'job-1' });
    });

    it('runs a coordinator poll for every registered server on the VPS', async () => {
        mockServerContexts([createServerRecord('lts'), createServerRecord('lts1'), createServerRecord('lts2')]);
        processNextLocalUserChatJobMock
            .mockResolvedValueOnce({ didMutate: false, outcome: 'waiting' })
            .mockResolvedValueOnce({ didMutate: true, outcome: 'completed' })
            .mockResolvedValueOnce({ didMutate: false, outcome: 'waiting' });

        const result = await runDurableUserChatJobWorkerTick();

        // Note: The second server mutated, so the tick reports work across the whole VPS.
        expect(result).toEqual({ didMutate: true });
        expect(recoverExpiredRunningUserChatJobsMock).toHaveBeenCalledTimes(3);
        expect(processNextLocalUserChatJobMock).toHaveBeenCalledTimes(3);
        expect(processNextLocalUserChatJobMock).toHaveBeenNthCalledWith(1, { preferredJobId: undefined });
    });

    it('reports no work when every server tick is idle', async () => {
        mockServerContexts([createServerRecord('lts'), createServerRecord('lts1')]);

        const result = await runDurableUserChatJobWorkerTick();

        expect(result).toEqual({ didMutate: false });
        expect(processNextLocalUserChatJobMock).toHaveBeenCalledTimes(2);
    });

    it('keeps processing other servers when one server throws', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockServerContexts([createServerRecord('lts'), createServerRecord('lts1')]);
        processNextLocalUserChatJobMock
            .mockRejectedValueOnce(new Error('server lts is down'))
            .mockResolvedValueOnce({ didMutate: true, outcome: 'completed' });

        const result = await runDurableUserChatJobWorkerTick();

        expect(result).toEqual({ didMutate: true });
        expect(processNextLocalUserChatJobMock).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[user-chat-job] worker tick failed for one VPS server',
            expect.objectContaining({ serverName: 'lts', serverDomain: 'lts.example.com' }),
        );
    });
});
