import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { ParsedAdminChatTaskQuery } from '../parseAdminChatTaskQuery';
import {
    createAdminChatTaskBaseQuery,
    createAdminChatTaskCountersQuery,
    createAdminChatTaskListQuery,
} from './adminChatTaskSqlQuery';
import { resolveSqlCount } from './adminChatTaskSqlValues';
import type { GetAdminChatTasksData } from './GetAdminChatTasksData';
import type { AdminChatTaskCountersSqlRow, AdminChatTaskSqlRow } from './mapAdminChatTaskSqlRows';
import { mapAdminChatTaskCounters, mapAdminChatTaskSqlRow } from './mapAdminChatTaskSqlRows';

/**
 * Loads admin task-manager data through the existing PostgreSQL raw SQL path.
 *
 * @private function of `getAdminChatTasks`
 */
export async function getAdminChatTasksViaClientSql(query: ParsedAdminChatTaskQuery): Promise<GetAdminChatTasksData> {
    const sql = await $provideClientSql();
    const userChatJobTable = quoteIdentifier(await $getTableName('UserChatJob'));
    const userChatTimeoutTable = quoteIdentifier(await resolvePrefixedTableName('UserChatTimeout'));
    const userTable = quoteIdentifier(await $getTableName('User'));
    const agentTable = quoteIdentifier(await $getTableName('Agent'));
    const baseTaskQuery = createAdminChatTaskBaseQuery({
        userChatJobTable,
        userChatTimeoutTable,
        userTable,
        agentTable,
    });
    const listQuery = createAdminChatTaskListQuery({ baseTaskQuery, query });
    const listRows = await sql.raw<Array<AdminChatTaskSqlRow>>(listQuery.sql, listQuery.values);
    const counterRows = await sql.raw<Array<AdminChatTaskCountersSqlRow>>(
        createAdminChatTaskCountersQuery({ baseTaskQuery }),
    );

    return {
        items: listRows.map(mapAdminChatTaskSqlRow),
        counters: mapAdminChatTaskCounters(counterRows[0]),
        total: resolveSqlCount(listRows[0]?.totalCount),
    };
}

/**
 * Quotes one trusted internal table identifier for raw SQL usage.
 *
 * @private function of `getAdminChatTasks`
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Resolves one prefixed table name using the runtime-configured Supabase prefix.
 *
 * @private function of `getAdminChatTasks`
 */
async function resolvePrefixedTableName(tableName: string): Promise<string> {
    const prefixedUserTable = await $getTableName('User');
    const tablePrefix = prefixedUserTable.slice(0, prefixedUserTable.length - 'User'.length);
    return `${tablePrefix}${tableName}`;
}
