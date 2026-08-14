import {
    createAgentPlannedMessagesSidecarContent,
    createAgentPlannedMessagesSidecarPath,
    parseAgentPlannedMessagesSidecar,
} from './AgentPlannedMessagesSidecar';

describe('AgentPlannedMessagesSidecar', () => {
    it('derives one stable sidecar path from the queued message file name', () => {
        expect(createAgentPlannedMessagesSidecarPath('2026-08-14-goal-agent1234-job5.book').replace(/\\/gu, '/')).toBe(
            'messages/planned/2026-08-14-goal-agent1234-job5.json',
        );
        expect(createAgentPlannedMessagesSidecarPath('messages/queued/question.book').replace(/\\/gu, '/')).toBe(
            'messages/planned/question.json',
        );
    });

    it('round-trips one prepared sidecar', () => {
        const sidecarContent = createAgentPlannedMessagesSidecarContent({
            version: 1,
            agentPermanentId: 'Agent1234',
            currentPlannedMessages: [
                { timeoutId: 'timeout-1', dueAt: '2026-08-14T10:00:00.000Z', message: 'Re-check the projects.' },
            ],
            commands: [],
        });

        expect(parseAgentPlannedMessagesSidecar(sidecarContent)).toEqual({
            version: 1,
            agentPermanentId: 'Agent1234',
            currentPlannedMessages: [
                { timeoutId: 'timeout-1', dueAt: '2026-08-14T10:00:00.000Z', message: 'Re-check the projects.' },
            ],
            commands: [],
        });
    });

    it('keeps the harness-appended commands in their original order', () => {
        const sidecar = parseAgentPlannedMessagesSidecar(
            JSON.stringify({
                version: 1,
                agentPermanentId: 'agent1234',
                currentPlannedMessages: [],
                commands: [
                    { action: 'set', milliseconds: 3_600_000, message: 'Inspect the stale projects.' },
                    { action: 'cancel', timeoutId: 'timeout-1' },
                ],
            }),
        );

        expect(sidecar?.commands).toEqual([
            { action: 'set', milliseconds: 3_600_000, message: 'Inspect the stale projects.' },
            { action: 'cancel', timeoutId: 'timeout-1' },
        ]);
    });

    it('drops commands with an unknown action instead of failing the answered message', () => {
        const sidecar = parseAgentPlannedMessagesSidecar(
            JSON.stringify({
                version: 1,
                agentPermanentId: 'agent1234',
                commands: [{ action: 'reschedule', timeoutId: 'timeout-1' }, 'set', null, { action: 'cancel' }],
            }),
        );

        expect(sidecar?.commands).toEqual([{ action: 'cancel' }]);
        expect(sidecar?.currentPlannedMessages).toEqual([]);
    });

    it('rejects unusable sidecar content', () => {
        expect(parseAgentPlannedMessagesSidecar('not json at all')).toBeNull();
        expect(parseAgentPlannedMessagesSidecar('[]')).toBeNull();
        expect(parseAgentPlannedMessagesSidecar(JSON.stringify({ version: 2, agentPermanentId: 'a' }))).toBeNull();
        expect(parseAgentPlannedMessagesSidecar(JSON.stringify({ version: 1 }))).toBeNull();
    });
});
