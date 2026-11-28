import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import { getAdminChatTasksViaClientSql } from './getAdminChatTasks/getAdminChatTasksViaClientSql';
import { getAdminChatTasksViaSupabaseQuery } from './getAdminChatTasks/getAdminChatTasksViaSupabaseQuery';
import type { GetAdminChatTasksData } from './getAdminChatTasks/GetAdminChatTasksData';
import type { ParsedAdminChatTaskQuery } from './parseAdminChatTaskQuery';

export type { GetAdminChatTasksData };

/**
 * Loads the admin task-manager data from durable chat job and timeout tables.
 *
 * @private function of `getAdminChatTasksResponse`
 */
export async function getAdminChatTasks(query: ParsedAdminChatTaskQuery): Promise<GetAdminChatTasksData> {
    if (isAgentsServerSqliteMode()) {
        return getAdminChatTasksViaSupabaseQuery(query);
    }

    return getAdminChatTasksViaClientSql(query);
}
