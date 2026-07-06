import type { AdminChatTaskCounters, AdminChatTaskRecord } from '../../chatTasksAdmin';
import { HOUR_IN_MILLISECONDS, isIsoTimestampAtOrAfter, parseIsoTimestamp } from './adminChatTaskTimeUtilities';

/**
 * Calculates the summary counters rendered above the admin task table.
 *
 * @private function of `getAdminChatTasks`
 */
export function createAdminChatTaskCounters(
    tasks: ReadonlyArray<AdminChatTaskRecord>,
    nowTimestamp: number,
): AdminChatTaskCounters {
    const queuedTimestamps = tasks
        .filter((task) => task.status === 'QUEUED')
        .map((task) => parseIsoTimestamp(task.queuedAt))
        .filter((timestamp): timestamp is number => timestamp !== null);
    const oldestQueuedTimestamp = queuedTimestamps.length > 0 ? Math.min(...queuedTimestamps) : null;

    return {
        runningCount: tasks.filter((task) => task.status === 'RUNNING').length,
        queuedCount: tasks.filter((task) => task.status === 'QUEUED').length,
        failedLast24hCount: tasks.filter(
            (task) =>
                task.status === 'FAILED' &&
                isIsoTimestampAtOrAfter(task.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS),
        ).length,
        oldestQueuedAgeMs: oldestQueuedTimestamp === null ? null : Math.max(0, nowTimestamp - oldestQueuedTimestamp),
    };
}
