import type { TODO_any } from '@promptbook-local/types';

/**
 * Minimal query result shape consumed by Agents Server Supabase call sites.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteQueryResult<TData = TODO_any> = {
    readonly data: TData | null;
    readonly error: LocalSqliteError | null;
    readonly count?: number | null;
    readonly status?: number;
    readonly statusText?: string;
};

/**
 * Supabase-like error shape returned by the local SQLite adapter.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteError = {
    readonly code?: string;
    readonly message: string;
    readonly details?: string;
    readonly hint?: string;
};

/**
 * Supported query operation kinds.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/**
 * Query filter captured from Supabase-like fluent calls.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'neq' | 'is' | 'not-is' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike';
    readonly value: unknown;
};

/**
 * Query order captured from Supabase-like fluent calls.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteOrder = {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst?: boolean;
};

/**
 * Select options supported by Supabase and used by this app.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteSelectOptions = {
    readonly count?: 'exact';
    readonly head?: boolean;
};

/**
 * Upsert options supported by Supabase and used by this app.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteUpsertOptions = {
    readonly onConflict?: string;
};

/**
 * SQL clause fragment paired with its positional bind values.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteSqlFragment = {
    readonly sql: string;
    readonly values: ReadonlyArray<unknown>;
};
