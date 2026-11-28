import { describe, expect, it } from '@jest/globals';
import { createUserChatJobFailureDetails } from './createUserChatJobFailureDetails';

describe('createUserChatJobFailureDetails', () => {
    it('serializes error stack and durable chat-job context into persisted diagnostics', () => {
        const error = new Error('Provider request failed.');

        const details = JSON.parse(
            createUserChatJobFailureDetails({
                job: {
                    id: 'job-123',
                    status: 'RUNNING',
                    userId: 7,
                    agentPermanentId: 'agent-123',
                    chatId: 'chat-123',
                    userMessageId: 'user-123',
                    assistantMessageId: 'assistant-123',
                    clientMessageId: 'client-123',
                    attemptCount: 2,
                    queuedAt: '2026-04-07T09:00:00.000Z',
                    startedAt: '2026-04-07T09:00:02.000Z',
                    updatedAt: '2026-04-07T09:00:05.000Z',
                    lastHeartbeatAt: '2026-04-07T09:00:04.000Z',
                    leaseExpiresAt: '2026-04-07T09:05:04.000Z',
                },
                summary: 'Provider request failed.',
                source: 'runUserChatJob',
                provider: 'openai',
                generationDurationMs: 3210,
                error,
            }),
        ) as {
            summary: string;
            source: string;
            provider: string | null;
            generationDurationMs: number | null;
            error: { name: string; message: string; stack?: string };
            job: {
                id: string;
                assistantMessageId: string;
                attemptCount: number;
                chatId: string;
            };
        };

        expect(details.summary).toBe('Provider request failed.');
        expect(details.source).toBe('runUserChatJob');
        expect(details.provider).toBe('openai');
        expect(details.generationDurationMs).toBe(3210);
        expect(details.error).toEqual({
            name: 'Error',
            message: 'Provider request failed.',
            stack: expect.any(String),
        });
        expect(details.job).toEqual(expect.objectContaining({
            id: 'job-123',
            assistantMessageId: 'assistant-123',
            attemptCount: 2,
            chatId: 'chat-123',
        }));
    });

    it('captures expired-lease failures even when no runtime error object exists', () => {
        const diagnostics = {
            timings: {
                leaseExpiredByMs: 1_234,
            },
            limitSignals: {
                isLeaseExpired: true,
                didExceedWorkerRouteMaxDurationAtRecovery: true,
            },
        };
        const details = JSON.parse(
            createUserChatJobFailureDetails({
                job: {
                    id: 'job-expired',
                    status: 'RUNNING',
                    userId: 3,
                    agentPermanentId: 'agent-expired',
                    chatId: 'chat-expired',
                    userMessageId: 'user-expired',
                    assistantMessageId: 'assistant-expired',
                    clientMessageId: 'client-expired',
                    attemptCount: 1,
                    queuedAt: '2026-04-07T08:59:00.000Z',
                    startedAt: '2026-04-07T09:00:00.000Z',
                    updatedAt: '2026-04-07T09:04:59.000Z',
                    lastHeartbeatAt: '2026-04-07T09:04:59.000Z',
                    leaseExpiresAt: '2026-04-07T09:05:00.000Z',
                },
                summary: 'Background worker lease expired before the chat turn finished.',
                source: 'recoverExpiredRunningUserChatJobs',
                recordedAt: '2026-04-07T09:05:01.234Z',
                provider: null,
                diagnostics,
            }),
        ) as {
            recordedAt: string;
            error: unknown;
            diagnostics: typeof diagnostics;
            job: { leaseExpiresAt: string | null; chatId: string };
        };

        expect(details.recordedAt).toBe('2026-04-07T09:05:01.234Z');
        expect(details.error).toBeNull();
        expect(details.diagnostics).toEqual(diagnostics);
        expect(details.job).toEqual(expect.objectContaining({
            leaseExpiresAt: '2026-04-07T09:05:00.000Z',
            chatId: 'chat-expired',
        }));
    });
});
