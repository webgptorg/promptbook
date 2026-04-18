import { describe, expect, it } from '@jest/globals';
import { SERVER_LIMIT_KEYS } from '@/src/constants/serverLimits';
import {
    createExpiredRunningUserChatJobFailureDiagnostics,
    type ExpiredRunningUserChatJobRuntimeSnapshot,
} from './createExpiredRunningUserChatJobFailureDiagnostics';

describe('expiredRunningUserChatJobDiagnostics', () => {
    it('marks worker-runtime and lease signals when an expired job outlived the worker route', () => {
        const runtimeSnapshot: ExpiredRunningUserChatJobRuntimeSnapshot = {
            recordedAt: '2026-04-15T07:36:07.305Z',
            runtimeLimits: {
                workerRouteMaxDurationMs: 300_000,
                leaseDurationMs: 600_000,
                heartbeatIntervalMs: 30_000,
                heartbeatTimeoutMs: 10_000,
                heartbeatMaxConsecutiveFailures: 20,
                assistantMessagePersistIntervalMs: 5_000,
            },
            serverLimits: {
                [SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT]: 3,
                [SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT]: 25,
                [SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]: 50,
                [SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS]: 60_000,
                [SERVER_LIMIT_KEYS.SPAWN_AGENT_MAX_DEPTH]: 2,
                [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_MAX]: 5,
                [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS]: 600_000,
            },
            activeTasks: {
                counters: {
                    runningCount: 4,
                    queuedCount: 7,
                    failedLast24hCount: 2,
                    oldestQueuedAgeMs: 120_000,
                },
                totalActiveCount: 11,
                snapshotLimit: 20,
                isSnapshotTruncated: false,
                items: [
                    {
                        id: '7QFn8mkUMTFnxg',
                        kind: 'CHAT_COMPLETION',
                        status: 'RUNNING',
                        userId: 3,
                        username: 'alice',
                        agentPermanentId: 'JrMi6YxWeLvjoK',
                        agentName: 'Research Agent',
                        chatId: '1DDpEA12wCozwR',
                        queueName: 'user-chat-jobs',
                        attemptCount: 1,
                        queuedAt: '2026-04-15T07:19:40.432Z',
                        startedAt: '2026-04-15T07:19:41.567Z',
                        updatedAt: '2026-04-15T07:25:11.872Z',
                        cancelRequestedAt: null,
                        pausedAt: null,
                        lastHeartbeatAt: '2026-04-15T07:25:11.872Z',
                        leaseExpiresAt: '2026-04-15T07:35:11.872Z',
                    },
                ],
            },
            loadErrors: null,
        };

        const diagnostics = createExpiredRunningUserChatJobFailureDiagnostics({
            job: {
                status: 'RUNNING',
                queuedAt: '2026-04-15T07:19:40.432Z',
                startedAt: '2026-04-15T07:19:41.567Z',
                updatedAt: '2026-04-15T07:25:11.872Z',
                lastHeartbeatAt: '2026-04-15T07:25:11.872Z',
                leaseExpiresAt: '2026-04-15T07:35:11.872Z',
            },
            runtimeSnapshot,
        });

        expect(diagnostics.timings).toEqual({
            queueDelayMs: 1_135,
            queuedAgeMs: 986_873,
            runningAgeMs: 985_738,
            updatedAgeMs: 655_433,
            lastHeartbeatAgeMs: 655_433,
            runningDurationAtLastHeartbeatMs: 330_305,
            leaseExpiredByMs: 55_433,
        });
        expect(diagnostics.limitSignals).toEqual({
            isLeaseExpired: true,
            didExceedWorkerRouteMaxDurationAtRecovery: true,
            didExceedWorkerRouteMaxDurationAtLastHeartbeat: true,
            didGapSinceLastHeartbeatReachLeaseDuration: true,
            missedHeartbeatIntervalsSinceLastHeartbeat: 21,
        });
        expect(diagnostics.activeTasks).toEqual(runtimeSnapshot.activeTasks);
        expect(diagnostics.serverLimits).toEqual(runtimeSnapshot.serverLimits);
    });
});
