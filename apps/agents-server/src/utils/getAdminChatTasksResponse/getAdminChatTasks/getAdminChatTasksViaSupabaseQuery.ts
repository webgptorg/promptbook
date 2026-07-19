import type { ParsedAdminChatTaskQuery } from '../parseAdminChatTaskQuery';
import { compareAdminChatTasks } from './compareAdminChatTasks';
import { createAdminChatTaskCounters } from './createAdminChatTaskCounters';
import { filterAdminChatTasks } from './filterAdminChatTasks';
import type { GetAdminChatTasksData } from './GetAdminChatTasksData';
import { loadAdminChatTaskFallbackData } from './loadAdminChatTaskFallbackData';
import { mapAdminChatTaskFallbackRows } from './mapAdminChatTaskFallbackRows';

/**
 * Loads admin task-manager data through the shared Supabase-shaped adapters used by SQLite mode.
 *
 * @private function of `getAdminChatTasks`
 */
export async function getAdminChatTasksViaSupabaseQuery(
    query: ParsedAdminChatTaskQuery,
): Promise<GetAdminChatTasksData> {
    const allTasks = mapAdminChatTaskFallbackRows(await loadAdminChatTaskFallbackData());
    const nowTimestamp = Date.now();
    const filteredTasks = filterAdminChatTasks(allTasks, query, nowTimestamp).sort((leftTask, rightTask) =>
        compareAdminChatTasks(leftTask, rightTask, query),
    );
    const pageOffset = (query.page - 1) * query.pageSize;

    return {
        items: filteredTasks.slice(pageOffset, pageOffset + query.pageSize),
        counters: createAdminChatTaskCounters(allTasks, nowTimestamp),
        total: filteredTasks.length,
    };
}
