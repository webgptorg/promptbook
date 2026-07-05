import type { AgentsServerSqliteDatabase } from '../$provideAgentsServerSqliteDatabase';
import { quoteIdentifier, sanitizeSqlIdentifier, uniqueStrings } from './localSqliteSql';
import {
    isTextPrimaryKeyTable,
    resolveReadIndexColumns,
    resolveReadIndexes,
    resolveSqliteColumnType,
    resolveTableBaseName,
    resolveUniqueIndexColumns,
    resolveUniqueIndexes,
} from './localSqliteTableSchema';

/**
 * Ensures a table and all required columns exist.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function ensureTable(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    requiredColumns: ReadonlyArray<string>,
): void {
    const tableBaseName = resolveTableBaseName(tableName);
    const primaryKey = isTextPrimaryKeyTable(tableBaseName)
        ? '"id" TEXT PRIMARY KEY'
        : '"id" INTEGER PRIMARY KEY AUTOINCREMENT';

    database.exec(`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName)} (${primaryKey})`);

    const existingColumns = new Set(
        database
            .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
            .all()
            .map((row) => String(row.name)),
    );
    const columnsToEnsure = uniqueStrings([...requiredColumns, ...resolveUniqueIndexColumns(tableBaseName)]).filter(
        (column) => column !== '*' && column !== 'id',
    );
    const columnsToEnsureWithIndexes = uniqueStrings([...columnsToEnsure, ...resolveReadIndexColumns(tableBaseName)]);

    for (const column of columnsToEnsureWithIndexes) {
        if (existingColumns.has(column)) {
            continue;
        }

        database.exec(
            `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(column)} ${resolveSqliteColumnType(
                tableBaseName,
                column,
            )}`,
        );
        existingColumns.add(column);
    }

    ensureUniqueIndexes(database, tableName, tableBaseName);
    ensureReadIndexes(database, tableName, tableBaseName);
}

/**
 * Creates known unique indexes after required columns exist.
 *
 * @private function of `ensureTable`
 */
function ensureUniqueIndexes(database: AgentsServerSqliteDatabase, tableName: string, tableBaseName: string): void {
    const uniqueIndexes = resolveUniqueIndexes(tableBaseName);

    for (const columns of uniqueIndexes) {
        const indexName = `idx_${sanitizeSqlIdentifier(tableName)}_${columns.join('_')}_unique`;
        const columnSql = columns.map(quoteIdentifier).join(', ');
        database.exec(
            `CREATE UNIQUE INDEX IF NOT EXISTS ${quoteIdentifier(indexName)} ON ${quoteIdentifier(
                tableName,
            )} (${columnSql})`,
        );
    }
}

/**
 * Creates known read indexes after required columns exist.
 *
 * @private function of `ensureTable`
 */
function ensureReadIndexes(database: AgentsServerSqliteDatabase, tableName: string, tableBaseName: string): void {
    const readIndexes = resolveReadIndexes(tableBaseName);

    for (const readIndex of readIndexes) {
        const indexName = `index_${sanitizeSqlIdentifier(tableName)}_${sanitizeSqlIdentifier(readIndex.name)}`;
        const columnSql = readIndex.columns.map(quoteIdentifier).join(', ');
        database.exec(
            `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(indexName)} ON ${quoteIdentifier(tableName)} (${columnSql})`,
        );
    }
}
