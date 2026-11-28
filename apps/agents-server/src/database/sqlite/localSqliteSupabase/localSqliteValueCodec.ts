import { isBooleanColumn, isJsonColumn, isTextColumn } from './localSqliteTableSchema';

/**
 * Serializes one value for SQLite storage.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function serializeValue(tableName: string, column: string, value: unknown): unknown {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (isTextColumn(tableName, column)) {
        return String(value);
    }
    if (isJsonColumn(tableName, column)) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
    if (isBooleanColumn(column)) {
        return value ? 1 : 0;
    }
    return value;
}

/**
 * Deserializes one SQLite row into Supabase-like row values.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function deserializeRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [column, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
            result[column] = null;
        } else if (isTextColumn(tableName, column)) {
            result[column] = String(value);
        } else if (isJsonColumn(tableName, column) && typeof value === 'string') {
            result[column] = parseJsonValue(value);
        } else if (isBooleanColumn(column)) {
            result[column] = Boolean(value);
        } else {
            result[column] = value;
        }
    }

    return result;
}

/**
 * Parses JSON while preserving invalid strings.
 *
 * @private function of `deserializeRow`
 */
function parseJsonValue(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}
