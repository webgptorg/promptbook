import type { AdminChatTaskRecord, AdminChatTaskView } from '../../chatTasksAdmin';
import type { UserChatJobStatus } from '../../userChat/UserChatJobRecord';
import { parseIsoTimestamp } from './adminChatTaskTimeUtilities';

/**
 * Compares two tasks using the same ordering semantics as the PostgreSQL dashboard query.
 *
 * @private function of `getAdminChatTasks`
 */
export function compareAdminChatTasks(
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
            return (
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
    const leftTimestamp = parseIsoTimestamp(leftTimestampIso);
    const rightTimestamp = parseIsoTimestamp(rightTimestampIso);

    if (leftTimestamp === rightTimestamp) {
        return 0;
    }
    if (leftTimestamp === null) {
        return 1;
    }
    if (rightTimestamp === null) {
        return -1;
    }

    return compareNumbersDescending(leftTimestamp, rightTimestamp);
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
 * Sorts strings descending.
 *
 * @private function of `getAdminChatTasks`
 */
function compareStringsDescending(leftString: string, rightString: string): number {
    return leftString === rightString ? 0 : leftString < rightString ? 1 : -1;
}
