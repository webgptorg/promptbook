import type { AdminChatTaskRecord } from '../../chatTasksAdmin';
import type { ParsedAdminChatTaskQuery } from '../parseAdminChatTaskQuery';
import { HOUR_IN_MILLISECONDS, isIsoTimestampAtOrAfter } from './adminChatTaskTimeUtilities';

/**
 * Keeps only the tasks that belong to the requested admin task-manager view and search.
 *
 * @private function of `getAdminChatTasks`
 */
export function filterAdminChatTasks(
    tasks: ReadonlyArray<AdminChatTaskRecord>,
    query: ParsedAdminChatTaskQuery,
    nowTimestamp: number,
): Array<AdminChatTaskRecord> {
    return tasks.filter(
        (task) => matchesAdminChatTaskView(task, query, nowTimestamp) && matchesAdminChatTaskSearch(task, query.search),
    );
}

/**
 * Returns whether one task belongs in the requested admin task-manager view.
 *
 * @private function of `getAdminChatTasks`
 */
function matchesAdminChatTaskView(
    task: AdminChatTaskRecord,
    query: ParsedAdminChatTaskQuery,
    nowTimestamp: number,
): boolean {
    switch (query.view) {
        case 'running':
            return task.status === 'RUNNING';
        case 'queued':
            return task.status === 'QUEUED';
        case 'failed':
            return (
                task.status === 'FAILED' &&
                isIsoTimestampAtOrAfter(task.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS)
            );
        case 'all':
            return isIsoTimestampAtOrAfter(task.updatedAt, nowTimestamp - query.timeWindowHours * HOUR_IN_MILLISECONDS);
        case 'active':
        default:
            return task.status === 'QUEUED' || task.status === 'RUNNING';
    }
}

/**
 * Returns whether one task matches the free-text admin search input.
 *
 * @private function of `getAdminChatTasks`
 */
function matchesAdminChatTaskSearch(task: AdminChatTaskRecord, search: string): boolean {
    if (!search) {
        return true;
    }

    if (
        task.id === search ||
        task.id.startsWith(search) ||
        task.chatId === search ||
        task.chatId.startsWith(search) ||
        task.agentPermanentId === search ||
        task.agentPermanentId.startsWith(search)
    ) {
        return true;
    }

    const normalizedSearch = search.toLowerCase();
    if ((task.agentName || '').toLowerCase().includes(normalizedSearch)) {
        return true;
    }
    if ((task.username || '').toLowerCase().includes(normalizedSearch)) {
        return true;
    }

    return /^\d+$/.test(search) && task.userId === Number.parseInt(search, 10);
}
