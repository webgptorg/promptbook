import type {
    AdminChatTaskRecord,
    AdminChatTaskSortField,
    AdminChatTaskSortOrder,
    AdminChatTaskView,
} from '../../chatTasksAdmin';
import type { UserChatJobStatus } from '../../userChat/UserChatJobRecord';
import { parseIsoTimestamp } from './adminChatTaskTimeUtilities';

/**
 * Collator used for user-facing task-manager text sorting.
 *
 * @private function of `getAdminChatTasks`
 */
const ADMIN_CHAT_TASK_STRING_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

/**
 * Query fields needed for task-manager row comparison.
 *
 * @private function of `getAdminChatTasks`
 */
type AdminChatTaskSortQuery = {
    readonly sortBy: AdminChatTaskSortField;
    readonly sortOrder: AdminChatTaskSortOrder;
    readonly view: AdminChatTaskView;
};

/**
 * Comparable value used by custom task-manager table sorting.
 *
 * @private function of `getAdminChatTasks`
 */
type AdminChatTaskSortValue = string | number | null;

/**
 * Compares two tasks using the same ordering semantics as the PostgreSQL dashboard query.
 *
 * @private function of `getAdminChatTasks`
 */
export function compareAdminChatTasks(
    leftTask: AdminChatTaskRecord,
    rightTask: AdminChatTaskRecord,
    query: AdminChatTaskSortQuery,
): number {
    if (query.sortBy !== 'default') {
        return (
            compareAdminChatTaskSortValues(
                resolveAdminChatTaskSortValue(leftTask, query.sortBy),
                resolveAdminChatTaskSortValue(rightTask, query.sortBy),
                query.sortOrder,
            ) || compareAdminChatTasksByDefaultView(leftTask, rightTask, query.view)
        );
    }

    return compareAdminChatTasksByDefaultView(leftTask, rightTask, query.view);
}

/**
 * Compares two tasks using the view-specific operational default order.
 *
 * @private function of `getAdminChatTasks`
 */
function compareAdminChatTasksByDefaultView(
    leftTask: AdminChatTaskRecord,
    rightTask: AdminChatTaskRecord,
    view: AdminChatTaskView,
): number {
    switch (view) {
        case 'running':
            return (
                compareNullableIsoTimestampsDescending(leftTask.startedAt, rightTask.startedAt) ||
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'queued':
            return (
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'failed':
            return (
                compareNullableIsoTimestampsDescending(leftTask.finishedAt, rightTask.finishedAt) ||
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'all':
            // The `All` history view is ordered by finished time so the newest finished task is on top;
            // the shared timeline timestamp resolves to `finishedAt` for terminal tasks while keeping
            // still-active tasks placed by their start/queue time instead of dropping them to the bottom.
            return (
                compareNullableNumbersDescending(
                    resolveAdminChatTaskTimelineTimestamp(leftTask),
                    resolveAdminChatTaskTimelineTimestamp(rightTask),
                ) ||
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'active':
        default:
            return (
                compareNumbersAscending(
                    resolveAdminChatTaskActiveStatusRank(leftTask.status),
                    resolveAdminChatTaskActiveStatusRank(rightTask.status),
                ) ||
                compareNullableIsoTimestampsDescending(
                    leftTask.status === 'RUNNING' ? leftTask.startedAt : null,
                    rightTask.status === 'RUNNING' ? rightTask.startedAt : null,
                ) ||
                compareNullableIsoTimestampsDescending(
                    leftTask.status === 'QUEUED' ? leftTask.createdAt : null,
                    rightTask.status === 'QUEUED' ? rightTask.createdAt : null,
                ) ||
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
    }
}

/**
 * Resolves the custom sort value for one task-manager row.
 *
 * @private function of `getAdminChatTasks`
 */
function resolveAdminChatTaskSortValue(
    task: AdminChatTaskRecord,
    sortBy: Exclude<AdminChatTaskSortField, 'default'>,
): AdminChatTaskSortValue {
    switch (sortBy) {
        case 'task':
            return task.id;
        case 'ownership':
            return [task.username || `#${task.userId}`, task.agentName || task.agentPermanentId, task.chatId].join(' ');
        case 'timeline':
            return resolveAdminChatTaskTimelineTimestamp(task);
        case 'duration':
            return resolveAdminChatTaskDurationMs(task);
        case 'queue':
            return [task.queueName || '', task.workerId || '', task.leaseExpiresAt || ''].join(' ');
        case 'lastError':
            return task.lastErrorSummary;
    }
}

/**
 * Resolves the primary timeline timestamp used by the visible task timeline column.
 *
 * @private function of `getAdminChatTasks`
 */
function resolveAdminChatTaskTimelineTimestamp(task: AdminChatTaskRecord): number | null {
    if (task.status === 'RUNNING') {
        return parseIsoTimestamp(task.startedAt) ?? parseIsoTimestamp(task.createdAt);
    }

    if (task.status === 'QUEUED') {
        return parseIsoTimestamp(task.createdAt);
    }

    return parseIsoTimestamp(task.finishedAt) ?? parseIsoTimestamp(task.updatedAt) ?? parseIsoTimestamp(task.createdAt);
}

/**
 * Resolves the total task duration in milliseconds.
 *
 * @private function of `getAdminChatTasks`
 */
function resolveAdminChatTaskDurationMs(task: AdminChatTaskRecord): number | null {
    const createdTimestamp = parseIsoTimestamp(task.createdAt);
    if (createdTimestamp === null) {
        return null;
    }

    const endTimestamp =
        parseIsoTimestamp(task.finishedAt) ?? parseIsoTimestamp(task.updatedAt) ?? Date.now();

    return Math.max(0, endTimestamp - createdTimestamp);
}

/**
 * Compares custom task-manager sort values while keeping missing values last.
 *
 * @private function of `getAdminChatTasks`
 */
function compareAdminChatTaskSortValues(
    leftValue: AdminChatTaskSortValue,
    rightValue: AdminChatTaskSortValue,
    sortOrder: AdminChatTaskSortOrder,
): number {
    const isLeftValueMissing = leftValue === null || leftValue === '';
    const isRightValueMissing = rightValue === null || rightValue === '';

    if (isLeftValueMissing && isRightValueMissing) {
        return 0;
    }
    if (isLeftValueMissing) {
        return 1;
    }
    if (isRightValueMissing) {
        return -1;
    }

    const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
            ? compareNumbersAscending(leftValue, rightValue)
            : compareStringsAscending(String(leftValue), String(rightValue));

    return sortOrder === 'asc' ? comparison : -comparison;
}

/**
 * Resolves the status sort bucket used by the `Active` dashboard view.
 *
 * @private function of `getAdminChatTasks`
 */
function resolveAdminChatTaskActiveStatusRank(status: UserChatJobStatus): number {
    switch (status) {
        case 'RUNNING':
            return 0;
        case 'QUEUED':
            return 1;
        default:
            return 2;
    }
}

/**
 * Sorts timestamps descending while keeping `null` values last.
 *
 * @private function of `getAdminChatTasks`
 */
function compareNullableIsoTimestampsDescending(
    leftTimestampIso: string | null,
    rightTimestampIso: string | null,
): number {
    return compareNullableNumbersDescending(parseIsoTimestamp(leftTimestampIso), parseIsoTimestamp(rightTimestampIso));
}

/**
 * Sorts nullable numbers descending while keeping `null` values last.
 *
 * @private function of `getAdminChatTasks`
 */
function compareNullableNumbersDescending(leftNumber: number | null, rightNumber: number | null): number {
    if (leftNumber === rightNumber) {
        return 0;
    }
    if (leftNumber === null) {
        return 1;
    }
    if (rightNumber === null) {
        return -1;
    }

    return compareNumbersDescending(leftNumber, rightNumber);
}

/**
 * Sorts required timestamps descending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareIsoTimestampsDescending(leftTimestampIso: string, rightTimestampIso: string): number {
    return compareNullableIsoTimestampsDescending(leftTimestampIso, rightTimestampIso);
}

/**
 * Sorts numbers ascending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareNumbersAscending(leftNumber: number, rightNumber: number): number {
    return leftNumber - rightNumber;
}

/**
 * Sorts numbers descending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareNumbersDescending(leftNumber: number, rightNumber: number): number {
    return rightNumber - leftNumber;
}

/**
 * Sorts strings ascending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareStringsAscending(leftString: string, rightString: string): number {
    return ADMIN_CHAT_TASK_STRING_COLLATOR.compare(leftString, rightString);
}

/**
 * Sorts strings descending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareStringsDescending(leftString: string, rightString: string): number {
    return leftString === rightString ? 0 : leftString < rightString ? 1 : -1;
}
