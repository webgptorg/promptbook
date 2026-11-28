import type { AdminChatTaskCounters, AdminChatTaskRecord } from '../../chatTasksAdmin';

/**
 * Loaded admin chat-task data before the final response envelope is assembled.
 *
 * @private type of `getAdminChatTasks`
 */
export type GetAdminChatTasksData = {
    items: Array<AdminChatTaskRecord>;
    counters: AdminChatTaskCounters;
    total: number;
};
