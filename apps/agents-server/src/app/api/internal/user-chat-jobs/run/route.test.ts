import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAfter = jest.fn((callback: () => unknown) => {
    void callback();
});

jest.mock('next/server', () => {
    const actualNextServer = jest.requireActual<typeof import('next/server')>('next/server');

    return {
        ...actualNextServer,
        after: mockAfter,
    };
});

jest.mock('@/src/utils/localChatRunner', () => ({
    processNextLocalUserChatJob: jest.fn(),
}));

jest.mock('@/src/utils/userChat', () => ({
    recoverExpiredRunningUserChatJobs: jest.fn(),
    resolveUserChatWorkerInternalToken: jest.fn(),
    triggerUserChatJobWorker: jest.fn(),
}));

import { after } from 'next/server';
import { processNextLocalUserChatJob } from '@/src/utils/localChatRunner';
import {
    recoverExpiredRunningUserChatJobs,
    resolveUserChatWorkerInternalToken,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { POST } from './route';

/**
 * Mocked expired-job recovery used by the worker route tests.
 */
const recoverExpiredRunningUserChatJobsMock = recoverExpiredRunningUserChatJobs as jest.MockedFunction<
    typeof recoverExpiredRunningUserChatJobs
>;

/**
 * Mocked durable chat job processor used by the worker route tests.
 */
const processNextLocalUserChatJobMock = processNextLocalUserChatJob as jest.MockedFunction<
    typeof processNextLocalUserChatJob
>;

/**
 * Mocked internal-token resolver used by the worker route tests.
 */
const resolveUserChatWorkerInternalTokenMock = resolveUserChatWorkerInternalToken as jest.MockedFunction<
    typeof resolveUserChatWorkerInternalToken
>;

/**
 * Mocked worker wake-up trigger used by the worker route tests.
 */
const triggerUserChatJobWorkerMock = triggerUserChatJobWorker as jest.MockedFunction<typeof triggerUserChatJobWorker>;

describe('POST /api/internal/user-chat-jobs/run', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        recoverExpiredRunningUserChatJobsMock.mockResolvedValue(0);
        processNextLocalUserChatJobMock.mockResolvedValue({
            didMutate: true,
            outcome: 'queued',
        } as Awaited<ReturnType<typeof processNextLocalUserChatJob>>);
        resolveUserChatWorkerInternalTokenMock.mockReturnValue('test-worker-token');
        triggerUserChatJobWorkerMock.mockResolvedValue();
        mockAfter.mockImplementation((callback: () => unknown) => {
            void callback();
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('keeps self-requeue transport failures out of error-level Sentry logging', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const requeueError = new TypeError('fetch failed');

        triggerUserChatJobWorkerMock.mockRejectedValueOnce(requeueError);

        const response = await POST(createAuthorizedWorkerRequest());

        await waitForMicrotaskQueue();

        expect(response.status).toBe(200);
        expect(after).toHaveBeenCalledTimes(1);
        expect(triggerUserChatJobWorkerMock).toHaveBeenCalledWith({
            origin: 'https://agents.example',
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith('[user-chat-job] requeue failed', requeueError);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('still reports worker execution failures as server errors', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const workerError = new Error('database unavailable');

        processNextLocalUserChatJobMock.mockRejectedValueOnce(workerError);

        const response = await POST(createAuthorizedWorkerRequest());

        await expect(response.json()).resolves.toEqual({
            error: 'database unavailable',
        });
        expect(response.status).toBe(500);
        expect(after).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[user-chat-job] worker route failed', workerError);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
});

/**
 * Creates one authorized internal worker request.
 *
 * @returns Authorized worker request.
 */
function createAuthorizedWorkerRequest(): Request {
    return new Request('https://agents.example/api/internal/user-chat-jobs/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-chat-worker-token': 'test-worker-token',
        },
        body: '{}',
    });
}

/**
 * Waits until promise continuations scheduled by `after()` callbacks settle.
 */
async function waitForMicrotaskQueue(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}
