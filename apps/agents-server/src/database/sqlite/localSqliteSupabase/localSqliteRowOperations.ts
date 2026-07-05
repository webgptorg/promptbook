import type { AgentsServerSqliteDatabase } from '../$provideAgentsServerSqliteDatabase';
import { createSelectExpression, quoteIdentifier } from './localSqliteSql';
import { deserializeRow, serializeValue } from './localSqliteValueCodec';
import { ensureTable } from './ensureTable';

/**
 * Inserts one row into the table.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function insertRow(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    row: Record<string, unknown>,
): { readonly lastInsertRowid: number | bigint } {
    const columns = Object.keys(row).filter((column) => row[column] !== undefined);

    if (columns.length === 0) {
        return database.prepare(`INSERT INTO ${quoteIdentifier(tableName)} DEFAULT VALUES`).run();
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) => serializeValue(tableName, column, row[column]));
    const sql = `INSERT INTO ${quoteIdentifier(tableName)} (${columns
        .map(quoteIdentifier)
        .join(', ')}) VALUES (${placeholders})`;

    return database.prepare(sql).run(...values);
}

/**
 * Updates one row by SQLite rowid.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function updateRowid(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    rowid: number | bigint,
    row: Record<string, unknown>,
): void {
    const columns = Object.keys(row).filter((column) => column !== 'id' && row[column] !== undefined);
    if (columns.length === 0) {
        return;
    }

    const assignments = columns.map((column) => `${quoteIdentifier(column)} = ?`).join(', ');
    const values = columns.map((column) => serializeValue(tableName, column, row[column]));
    database.prepare(`UPDATE ${quoteIdentifier(tableName)} SET ${assignments} WHERE rowid = ?`).run(...values, rowid);
}

/**
 * Finds the rowid matching an upsert conflict target.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function findConflictRowid(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    row: Record<string, unknown>,
    conflictColumns: ReadonlyArray<string>,
): number | bigint | null {
    if (conflictColumns.some((column) => row[column] === undefined)) {
        return null;
    }

    const conditions = conflictColumns.map((column) => `${quoteIdentifier(column)} = ?`).join(' AND ');
    const values = conflictColumns.map((column) => serializeValue(tableName, column, row[column]));
    const result = database
        .prepare(`SELECT rowid FROM ${quoteIdentifier(tableName)} WHERE ${conditions} LIMIT 1`)
        .get(...values);

    return result ? (result.rowid as number | bigint) : null;
}

/**
 * Selects rows by rowids for a mutation returning clause.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function selectRowsByRowids(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    rowids: ReadonlyArray<number | bigint>,
    selectedColumns: ReadonlyArray<string>,
): Array<Record<string, unknown>> {
    if (rowids.length === 0) {
        return [];
    }

    ensureTable(database, tableName, selectedColumns);
    const placeholders = rowids.map(() => '?').join(', ');
    const rows = database
        .prepare(
            `SELECT ${createSelectExpression(selectedColumns)} FROM ${quoteIdentifier(
                tableName,
            )} WHERE rowid IN (${placeholders})`,
        )
        .all(...rowids);

    return rows.map((row) => deserializeRow(tableName, row));
}
