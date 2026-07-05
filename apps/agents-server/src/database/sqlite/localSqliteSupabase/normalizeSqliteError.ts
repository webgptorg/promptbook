import type { LocalSqliteError } from './localSqliteTypes';

/**
 * Converts SQLite errors into Supabase-like errors.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function normalizeSqliteError(error: unknown): LocalSqliteError {
    const message = error instanceof Error ? error.message : String(error);
    const sqliteCode =
        typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
            ? (error as { code: string }).code
            : undefined;

    return {
        code:
            sqliteCode === 'SQLITE_CONSTRAINT_UNIQUE' || sqliteCode === 'SQLITE_CONSTRAINT_PRIMARYKEY'
                ? '23505'
                : sqliteCode,
        message,
    };
}
