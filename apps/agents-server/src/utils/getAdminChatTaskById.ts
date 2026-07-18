import type { AdminChatTaskRecord } from './chatTasksAdmin';
import { getAdminChatTasksResponse } from './getAdminChatTasksResponse';

/**
 * Widest history window (in hours) accepted by the admin task listing.
 *
 * @private constant of `getAdminChatTaskById`
 */
const TASK_LOOKUP_TIME_WINDOW_HOURS = 24 * 30;

/**
 * Maximum number of candidate rows inspected while resolving one task id.
 *
 * @private constant of `getAdminChatTaskById`
 */
const TASK_LOOKUP_PAGE_SIZE = 200;

/**
 * Loads one durable background task by its id for the admin task detail page.
 *
 * Reuses the whole task-manager listing pipeline (durable jobs, VPS self-updates,
 * browser previews, run reports) so the detail page shows exactly the same data
 * as the `/admin/task-manager` table (DRY).
 *
 * @param taskId - Id of the durable task (`UserChatJob` id or injected task id).
 * @returns The task record or `null` when no task matches.
 */
export async function getAdminChatTaskById(taskId: string): Promise<AdminChatTaskRecord | null> {
    const normalizedTaskId = taskId.trim();
    if (!normalizedTaskId) {
        return null;
    }

    const searchParams = new URLSearchParams({
        view: 'all',
        search: normalizedTaskId,
        timeWindowHours: String(TASK_LOOKUP_TIME_WINDOW_HOURS),
        pageSize: String(TASK_LOOKUP_PAGE_SIZE),
    });

    const result = await getAdminChatTasksResponse(searchParams);
    if (result.status !== 200) {
        return null;
    }

    return result.response.items.find((task) => task.id === normalizedTaskId) || null;
}
