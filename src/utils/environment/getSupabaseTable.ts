/**
 * Get the Supabase table name with prefix if it is configured
 *
 * @param tableName - The original table name
 * @returns The prefixed table name
 *
 * @public exported from `@promptbook/utils`
 */
export function getSupabaseTable(tableName: string): string {
    let prefix = '';
    if (typeof process !== 'undefined' && process.env) {
        prefix = process.env.SUPABASE_TABLE_PREFIX || '';
    }
    return `${prefix}${tableName}`;
}
