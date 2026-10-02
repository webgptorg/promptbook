import { $provideServer } from '../tools/$provideServer';
import { AgentsServerDatabase } from './schema';

/**
 * Type representing the non-prefixed table names in the AgentsServerDatabase public schema
 */
type string_table_name = keyof AgentsServerDatabase['public']['Tables'];

/**
 * Get the Supabase table name with prefix if it is configured
 *
 * @param tableName - The original table name
 * @returns The prefixed table name
 */
export async function $getTableName<TTable extends string_table_name>(tableName: TTable): Promise<TTable> {
    const { tablePrefix } = await $provideServer();
    if (
        process.env.NEXT_RUNTIME !== 'edge' &&
        process.env.PTBK_AGENTS_SERVER_WORKSPACE &&
        (tableName === 'Agent' || tableName === 'AgentFolder')
    ) {
        const { provideWorkspaceAgentCollection } = await import('../utils/workspace/workspaceAgentStorage');
        await provideWorkspaceAgentCollection();
    }
    return `${tablePrefix}${tableName}` as TTable;
    // <- TODO: [🏧] DRY
}
