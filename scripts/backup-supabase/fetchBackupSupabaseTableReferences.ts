import { Client } from 'pg';

/**
 * One physical table selected for backup.
 *
 * @private type of backupSupabase
 */
export type TableReference = {
    /**
     * Schema where the table exists.
     */
    readonly schemaName: string;

    /**
     * Table name inside the schema.
     */
    readonly tableName: string;
};

/**
 * Reads all base tables from selected schemas.
 *
 * @param client Connected PostgreSQL client.
 * @param schemaNames Schemas selected for backup.
 * @returns Ordered table references.
 *
 * @private function of backupSupabase
 */
export async function fetchBackupSupabaseTableReferences(
    client: Client,
    schemaNames: ReadonlyArray<string>,
): Promise<Array<TableReference>> {
    const { rows } = await client.query<TableReference>(
        `
            SELECT
                table_schema AS "schemaName",
                table_name AS "tableName"
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema = ANY($1::text[])
            ORDER BY table_schema, table_name
        `,
        [schemaNames],
    );

    return rows;
}
