import { serializeError } from '@promptbook-local/utils';
import type { AdminChatTaskCounters, AdminChatTaskRecord } from '../chatTasksAdmin';
import type { ServerLimitValues } from '../serverLimits';
import { USER_CHAT_JOB_LEASE_DURATION_MS } from './claimNextQueuedUserChatJob';
import {
    DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS,
    DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
} from './createUserChatJobHeartbeatController';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { isUserChatJobLeaseExpired } from './userChatJobState';
import {
    USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS,
    USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS,
    USER_CHAT_JOB_WORKER_ROUTE_MAX_DURATION_MS,
} from './userChatJobRuntimeConstants';

/**
 * Serialized error payload reused when part of the diagnostic snapshot fails to load.
 */
type SerializedDiagnosticError = ReturnType<typeof serializeError>;

/**
 * Reduced active-task row captured inside one expired-lease diagnostic snapshot.
 */
export type ExpiredRunningUserChatJobTaskSnapshotItem = Pick<
    AdminChatTaskRecord,
    | 'id'
    | 'kind'
    | 'status'
    | 'userId'
    | 'username'
    | 'agentPermanentId'
    | 'agentName'
    | 'chatId'
    | 'queueName'
    | 'attemptCount'
    | 'queuedAt'
    | 'startedAt'
    | 'updatedAt'
    | 'cancelRequestedAt'
    | 'pausedAt'
    | 'lastHeartbeatAt'
    | 'leaseExpiresAt'
>;

/**
 * Shared runtime snapshot reused across one batch of expired-job failure details.
 */
export type ExpiredRunningUserChatJobRuntimeSnapshot = {
    recordedAt: string;
    runtimeLimits: {
        workerRouteMaxDurationMs: number;
        leaseDurationMs: number;
        heartbeatIntervalMs: number;
        heartbeatTimeoutMs: number;
        heartbeatMaxConsecutiveFailures: number;
        assistantMessagePersistIntervalMs: number;
    };
    serverLimits: ServerLimitValues | null;
    activeTasks: {
        counters: AdminChatTaskCounters;
        totalActiveCount: number;
        snapshotLimit: number;
        isSnapshotTruncated: boolean;
        items: Array<ExpiredRunningUserChatJobTaskSnapshotItem>;
    } | null;
    loadErrors: {
        serverLimits?: SerializedDiagnosticError;
        activeTasks?: SerializedDiagnosticError;
    } | null;
};

/**
 * Stable runtime thresholds included in every expired-lease diagnostic snapshot.
 */
export const EXPIRED_RUNNING_USER_CHAT_JOB_RUNTIME_LIMITS = {
    workerRouteMaxDurationMs: USER_CHAT_JOB_WORKER_ROUTE_MAX_DURATION_MS,
    leaseDurationMs: USER_CHAT_JOB_LEASE_DURATION_MS,
    heartbeatIntervalMs: DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS,
    heartbeatTimeoutMs: USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS,
    heartbeatMaxConsecutiveFailures: DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
    assistantMessagePersistIntervalMs: USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS,
} as const;

/**
 * Structured diagnostic payload attached to one expired running chat job.
 */
export type ExpiredRunningUserChatJobFailureDiagnostics = {
    timings: {
        queueDelayMs: number | null;
        queuedAgeMs: number | null;
        runningAgeMs: number | null;
        updatedAgeMs: number | null;
        lastHeartbeatAgeMs: number | null;
        runningDurationAtLastHeartbeatMs: number | null;
        leaseExpiredByMs: number | null;
    };
    runtimeLimits: ExpiredRunningUserChatJobRuntimeSnapshot['runtimeLimits'];
    limitSignals: {
        isLeaseExpired: boolean;
        didExceedWorkerRouteMaxDurationAtRecovery: boolean | null;
        didExceedWorkerRouteMaxDurationAtLastHeartbeat: boolean | null;
        didGapSinceLastHeartbeatReachLeaseDuration: boolean | null;
        missedHeartbeatIntervalsSinceLastHeartbeat: number | null;
    };
    serverLimits: ServerLimitValues | null;
    activeTasks: ExpiredRunningUserChatJobRuntimeSnapshot['activeTasks'];
    loadErrors: ExpiredRunningUserChatJobRuntimeSnapshot['loadErrors'];
};

/**
 * Creates the per-job diagnostic payload stored with one expired running chat job.
 */
export function createExpiredRunningUserChatJobFailureDiagnostics(options: {
    job: Pick<
        UserChatJobRecord,
        'status' | 'queuedAt' | 'startedAt' | 'updatedAt' | 'lastHeartbeatAt' | 'leaseExpiresAt'
    >;
    runtimeSnapshot: ExpiredRunningUserChatJobRuntimeSnapshot;
}): ExpiredRunningUserChatJobFailureDiagnostics {
    const recordedAtTimestamp = Date.parse(options.runtimeSnapshot.recordedAt);
    const runningDurationAtLastHeartbeatMs = resolveDurationBetweenIsoTimestamps(
        options.job.startedAt,
        options.job.lastHeartbeatAt,
    );
    const lastHeartbeatAgeMs = resolveAgeFromIsoTimestamp(options.job.lastHeartbeatAt, recordedAtTimestamp);

    return {
        timings: {
            queueDelayMs: resolveDurationBetweenIsoTimestamps(options.job.queuedAt, options.job.startedAt),
            queuedAgeMs: resolveAgeFromIsoTimestamp(options.job.queuedAt, recordedAtTimestamp),
            runningAgeMs: resolveAgeFromIsoTimestamp(options.job.startedAt, recordedAtTimestamp),
            updatedAgeMs: resolveAgeFromIsoTimestamp(options.job.updatedAt, recordedAtTimestamp),
            lastHeartbeatAgeMs,
            runningDurationAtLastHeartbeatMs,
            leaseExpiredByMs: resolveAgeFromIsoTimestamp(options.job.leaseExpiresAt, recordedAtTimestamp),
        },
        runtimeLimits: options.runtimeSnapshot.runtimeLimits,
        limitSignals: {
            isLeaseExpired: isUserChatJobLeaseExpired(
                {
                    status: options.job.status,
                    leaseExpiresAt: options.job.leaseExpiresAt,
                },
                new Date(options.runtimeSnapshot.recordedAt),
            ),
            didExceedWorkerRouteMaxDurationAtRecovery: resolveIsDurationAtLeastLimit(
                resolveAgeFromIsoTimestamp(options.job.startedAt, recordedAtTimestamp),
                options.runtimeSnapshot.runtimeLimits.workerRouteMaxDurationMs,
            ),
            didExceedWorkerRouteMaxDurationAtLastHeartbeat: resolveIsDurationAtLeastLimit(
                runningDurationAtLastHeartbeatMs,
                options.runtimeSnapshot.runtimeLimits.workerRouteMaxDurationMs,
            ),
            didGapSinceLastHeartbeatReachLeaseDuration: resolveIsDurationAtLeastLimit(
                lastHeartbeatAgeMs,
                options.runtimeSnapshot.runtimeLimits.leaseDurationMs,
            ),
            missedHeartbeatIntervalsSinceLastHeartbeat:
                lastHeartbeatAgeMs === null
                    ? null
                    : Math.max(
                          0,
                          Math.floor(lastHeartbeatAgeMs / options.runtimeSnapshot.runtimeLimits.heartbeatIntervalMs),
                      ),
        },
        serverLimits: options.runtimeSnapshot.serverLimits,
        activeTasks: options.runtimeSnapshot.activeTasks,
        loadErrors: options.runtimeSnapshot.loadErrors,
    };
}

/**
 * Resolves the elapsed milliseconds between a timestamp and the snapshot time.
 */
function resolveAgeFromIsoTimestamp(timestampIso: string | null, nowTimestamp: number): number | null {
    if (!timestampIso) {
        return null;
    }

    const timestamp = Date.parse(timestampIso);
    if (!Number.isFinite(timestamp)) {
        return null;
    }

    return Math.max(0, nowTimestamp - timestamp);
}

/**
 * Resolves the elapsed milliseconds between two timestamps.
 */
function resolveDurationBetweenIsoTimestamps(startIso: string | null, endIso: string | null): number | null {
    if (!startIso || !endIso) {
        return null;
    }

    const startTimestamp = Date.parse(startIso);
    const endTimestamp = Date.parse(endIso);

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
        return null;
    }

    return Math.max(0, endTimestamp - startTimestamp);
}

/**
 * Returns whether a duration reached the provided limit while preserving `null` for unknown values.
 */
function resolveIsDurationAtLeastLimit(durationMs: number | null, limitMs: number): boolean | null {
    if (durationMs === null) {
        return null;
    }

    return durationMs >= limitMs;
}
