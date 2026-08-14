import { mkdtemp, mkdir, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { createAgentPlannedMessagesSidecarPath } from '../../../../../src/book-3.0/AgentPlannedMessagesSidecar';
import type {
    CancelAgentGoalChatPlannedMessageResult,
    SetAgentGoalChatPlannedMessageResult,
} from '../agentGoalChat/agentGoalChatPlannedMessageActions';
import {
    applyLocalAgentPlannedMessageCommands,
    type LocalAgentPlannedMessageActions,
} from './applyLocalAgentPlannedMessageCommands';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

const JOB = {
    id: 'job-1',
    chatId: 'goal-agent1234',
    agentPermanentId: 'Agent1234',
};

const METADATA: LocalUserChatJobMetadata = {
    version: 1,
    agentDirectoryName: 'agent-agent1234',
    threadId: 'goal-agent1234',
    fileName: '2026-08-14-goal-agent1234-job-1.book',
    queuedPath: 'messages/queued/2026-08-14-goal-agent1234-job-1.book',
    finishedPath: 'messages/finished/2026-08-14-goal-agent1234-job-1.book',
    failedPath: 'messages/failed/2026-08-14-goal-agent1234-job-1.book',
    queuedAt: '2026-08-14T10:00:00.000Z',
    expectedMessagesBeforeAnswer: 1,
};

describe('applyLocalAgentPlannedMessageCommands', () => {
    it('schedules the planned messages a coding harness appended to its sidecar', async () => {
        const agentDirectoryPath = await createAgentDirectoryWithSidecar({
            version: 1,
            agentPermanentId: 'agent1234',
            currentPlannedMessages: [],
            commands: [
                { action: 'set', milliseconds: 3_600_000, message: 'Inspect the stale projects again.' },
                { action: 'cancel', timeoutId: 'timeout-1' },
            ],
        });
        const set = jest.fn(async () => createSetResult());
        const cancel = jest.fn(async () => createCancelResult('cancelled'));

        const appliedCommandCount = await applyLocalAgentPlannedMessageCommands({
            job: JOB,
            agentDirectoryPath,
            metadata: METADATA,
            actions: { set, cancel },
        });

        expect(appliedCommandCount).toBe(2);
        // Note: The canonical permanent id of the answered job wins over the lowercase runner-folder id
        expect(set).toHaveBeenCalledWith({
            agentPermanentId: 'Agent1234',
            milliseconds: 3_600_000,
            message: 'Inspect the stale projects again.',
        });
        expect(cancel).toHaveBeenCalledWith({ agentPermanentId: 'Agent1234', timeoutId: 'timeout-1' });
    });

    it('consumes the sidecar so a repeated worker tick cannot plan the same message twice', async () => {
        const agentDirectoryPath = await createAgentDirectoryWithSidecar({
            version: 1,
            agentPermanentId: 'agent1234',
            currentPlannedMessages: [],
            commands: [{ action: 'set', milliseconds: 60_000, message: 'Continue the goal.' }],
        });
        const set = jest.fn(async () => createSetResult());
        const actions: LocalAgentPlannedMessageActions = { set, cancel: jest.fn(async () => createCancelResult()) };

        await applyLocalAgentPlannedMessageCommands({ job: JOB, agentDirectoryPath, metadata: METADATA, actions });
        await applyLocalAgentPlannedMessageCommands({ job: JOB, agentDirectoryPath, metadata: METADATA, actions });

        expect(set).toHaveBeenCalledTimes(1);
        await expect(readFile(resolveSidecarPath(agentDirectoryPath), 'utf-8')).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('keeps applying the remaining commands when one of them is rejected', async () => {
        const agentDirectoryPath = await createAgentDirectoryWithSidecar({
            version: 1,
            agentPermanentId: 'agent1234',
            currentPlannedMessages: [],
            commands: [
                { action: 'set', milliseconds: -1, message: 'Broken delay.' },
                { action: 'set', milliseconds: 60_000, message: 'Continue the goal.' },
            ],
        });
        const set = jest
            .fn<Promise<SetAgentGoalChatPlannedMessageResult>, []>()
            .mockRejectedValueOnce(new Error('Invalid planned-message delay.'))
            .mockResolvedValueOnce(createSetResult());

        const appliedCommandCount = await applyLocalAgentPlannedMessageCommands({
            job: JOB,
            agentDirectoryPath,
            metadata: METADATA,
            actions: { set, cancel: jest.fn(async () => createCancelResult()) },
        });

        expect(appliedCommandCount).toBe(1);
        expect(set).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the harness never touched the sidecar', async () => {
        const agentDirectoryPath = await createAgentDirectoryWithSidecar({
            version: 1,
            agentPermanentId: 'agent1234',
            currentPlannedMessages: [{ timeoutId: 'timeout-1', dueAt: '2026-08-14T11:00:00.000Z', message: null }],
            commands: [],
        });
        const set = jest.fn(async () => createSetResult());
        const cancel = jest.fn(async () => createCancelResult());

        const appliedCommandCount = await applyLocalAgentPlannedMessageCommands({
            job: JOB,
            agentDirectoryPath,
            metadata: METADATA,
            actions: { set, cancel },
        });

        expect(appliedCommandCount).toBe(0);
        expect(set).not.toHaveBeenCalled();
        expect(cancel).not.toHaveBeenCalled();
    });

    it('ignores a missing sidecar', async () => {
        const agentDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-planned-messages-'));
        const set = jest.fn(async () => createSetResult());

        await expect(
            applyLocalAgentPlannedMessageCommands({
                job: JOB,
                agentDirectoryPath,
                metadata: METADATA,
                actions: { set, cancel: jest.fn(async () => createCancelResult()) },
            }),
        ).resolves.toBe(0);
        expect(set).not.toHaveBeenCalled();
    });
});

/**
 * Creates one temporary agent folder holding the given planned-message sidecar.
 */
async function createAgentDirectoryWithSidecar(sidecar: unknown): Promise<string> {
    const agentDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-planned-messages-'));
    const sidecarPath = resolveSidecarPath(agentDirectoryPath);

    await mkdir(dirname(sidecarPath), { recursive: true });
    await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf-8');

    return agentDirectoryPath;
}

/**
 * Resolves the sidecar path of the fixture message inside one temporary agent folder.
 */
function resolveSidecarPath(agentDirectoryPath: string): string {
    return join(agentDirectoryPath, createAgentPlannedMessagesSidecarPath(METADATA.fileName));
}

/**
 * Builds one successful scheduling result.
 */
function createSetResult(): SetAgentGoalChatPlannedMessageResult {
    return {
        action: 'set',
        status: 'set',
        timeoutId: 'timeout-2',
        dueAt: '2026-08-14T11:00:00.000Z',
        message: 'Continue the goal.',
    };
}

/**
 * Builds one cancellation result.
 */
function createCancelResult(
    status: CancelAgentGoalChatPlannedMessageResult['status'] = 'not_found',
): CancelAgentGoalChatPlannedMessageResult {
    return { action: 'cancel', status, timeoutId: 'timeout-1' };
}
