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
export function getTableName<TTable extends string_table_name>(tableName: TTable): TTable {
    let prefix = '';
    if (typeof process !== 'undefined' && process.env) {
        prefix = process.env.SUPABASE_TABLE_PREFIX || '';
    }
    return `${prefix}${tableName}` as TTable;
}
