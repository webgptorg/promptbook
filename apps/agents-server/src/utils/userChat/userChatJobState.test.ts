import {
    EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
    isUserChatJobLeaseExpired,
    resolveTerminalUserChatJobStatusFromMessage,
    resolveUserChatMessageToolCalls,
} from './userChatJobState';

describe('userChatJobState', () => {
    it('should resolve durable terminal statuses from completed assistant messages', () => {
        expect(
            resolveTerminalUserChatJobStatusFromMessage({
                lifecycleState: 'completed',
                isComplete: true,
            }),
        ).toBe('COMPLETED');
        expect(
            resolveTerminalUserChatJobStatusFromMessage({
                lifecycleState: 'failed',
                isComplete: true,
            }),
        ).toBe('FAILED');
        expect(
            resolveTerminalUserChatJobStatusFromMessage({
                lifecycleState: 'cancelled',
                isComplete: true,
            }),
        ).toBe('CANCELLED');
        expect(
            resolveTerminalUserChatJobStatusFromMessage({
                lifecycleState: 'running',
                isComplete: false,
            }),
        ).toBeNull();
    });

    it('should prefer the richest available tool-call snapshot from one assistant message', () => {
        const ongoingToolCalls = [{ name: 'search_web' }] as const;
        const completedToolCalls = [{ name: 'search_web', result: 'ok' }] as const;
        const finalToolCalls = [{ name: 'search_web', result: 'done' }] as const;

        expect(
            resolveUserChatMessageToolCalls({
                toolCalls: finalToolCalls,
                completedToolCalls,
                ongoingToolCalls,
            }),
        ).toBe(finalToolCalls);
        expect(
            resolveUserChatMessageToolCalls({
                toolCalls: undefined,
                completedToolCalls,
                ongoingToolCalls,
            }),
        ).toBe(completedToolCalls);
        expect(
            resolveUserChatMessageToolCalls({
                toolCalls: undefined,
                completedToolCalls: undefined,
                ongoingToolCalls,
            }),
        ).toBe(ongoingToolCalls);
    });

    it('should detect expired running leases and expose the shared failure reason', () => {
        expect(EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON).toContain('lease expired');
        expect(
            isUserChatJobLeaseExpired(
                {
                    status: 'RUNNING',
                    leaseExpiresAt: '2026-03-12T09:59:59.000Z',
                },
                new Date('2026-03-12T10:00:00.000Z'),
            ),
        ).toBe(true);
        expect(
            isUserChatJobLeaseExpired(
                {
                    status: 'QUEUED',
                    leaseExpiresAt: '2026-03-12T09:59:59.000Z',
                },
                new Date('2026-03-12T10:00:00.000Z'),
            ),
        ).toBe(false);
    });
});
