import { Client } from 'pg';
import { fetchBackupSupabaseTableSnapshot } from './fetchBackupSupabaseTableSnapshot';
import type { TableReference } from './fetchBackupSupabaseTableReferences';
import { renderBackupSupabaseTableSql } from './renderBackupSupabaseTableSql';

/**
 * Builds SQL file content for one table by combining database snapshot loading and SQL rendering.
 *
 * @param client Connected PostgreSQL client.
 * @param tableReference Target table reference.
 * @returns SQL file text.
 * @private function of backupSupabase
 */
export async function createBackupSupabaseTableSqlFileContent(
    client: Client,
    tableReference: TableReference,
): Promise<string> {
    const snapshot = await fetchBackupSupabaseTableSnapshot(client, tableReference);

    return renderBackupSupabaseTableSql(tableReference, snapshot);
}
