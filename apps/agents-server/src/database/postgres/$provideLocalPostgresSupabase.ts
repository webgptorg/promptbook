import type { SupabaseClient } from '@supabase/supabase-js';
import { type TODO_any } from '@promptbook-local/types';
import { Pool, type PoolClient } from 'pg';
import { resolvePostgresConnectionString } from '../resolvePostgresConnectionString';

/**
 * Minimal query result shape consumed by Agents Server Supabase call sites.
 */
type LocalPostgresQueryResult<TData = TODO_any> = {
    readonly data: TData | null;
    readonly error: LocalPostgresError | null;
    readonly count?: number | null;
    readonly status?: number;
    readonly statusText?: string;
};

/**
 * Supabase-like error shape returned by the standalone PostgreSQL adapter.
 */
type LocalPostgresError = {
    readonly code?: string;
    readonly message: string;
    readonly details?: string;
    readonly hint?: string;
};

/**
 * Supported query operation kinds.
 */
type LocalPostgresOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/**
 * Query filter captured from Supabase-like fluent calls.
 */
type LocalPostgresFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'neq' | 'is' | 'not-is' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike';
    readonly value: unknown;
};

/**
 * Query order captured from Supabase-like fluent calls.
 */
type LocalPostgresOrder = {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst?: boolean;
};

/**
 * Select options supported by Supabase and used by this app.
 */
type LocalPostgresSelectOptions = {
    readonly count?: 'exact';
    readonly head?: boolean;
};

/**
 * Upsert options supported by Supabase and used by this app.
 */
type LocalPostgresUpsertOptions = {
    readonly onConflict?: string;
};

/**
 * Known unique conflict columns used when `.upsert` omits `onConflict`.
 */
const DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE = new Map<string, ReadonlyArray<string>>([
    ['AgentExternals', ['type', 'hash']],
    ['LlmCache', ['hash']],
    ['VectorStoreKnowledgeSourceHashes', ['source']],
    ['Metadata', ['key']],
    ['ServerLimit', ['key']],
]);

/**
 * Cached Supabase-shaped local client.
 */
let localPostgresSupabase: SupabaseClient | null = null;

/**
 * Shared PostgreSQL pool reused across standalone server-side table access.
 */
let localPostgresPool: Pool | null = null;

/**
 * Provides a Supabase-shaped client backed by a direct PostgreSQL connection.
 */
export function $provideLocalPostgresSupabase(): SupabaseClient {
    if (localPostgresSupabase) {
        return localPostgresSupabase;
    }

    localPostgresSupabase = new LocalPostgresSupabaseClient($provideAgentsServerPostgresPool()) as unknown as SupabaseClient;
    return localPostgresSupabase;
}

/**
 * Resets the cached PostgreSQL adapter and closes its pool for isolated tests.
 */
export async function $resetLocalPostgresSupabaseForTests(): Promise<void> {
    localPostgresSupabase = null;

    if (localPostgresPool) {
        await localPostgresPool.end();
        localPostgresPool = null;
    }
}

/**
 * Provides the shared PostgreSQL pool used by the standalone adapter.
 */
function $provideAgentsServerPostgresPool(): Pool {
    if (!localPostgresPool) {
        localPostgresPool = new Pool({
            connectionString: resolvePostgresConnectionString(),
            ssl: { rejectUnauthorized: false },
        });
    }

    return localPostgresPool;
}

/**
 * Supabase-shaped client with only the table query surface used by Agents Server.
 */
class LocalPostgresSupabaseClient {
    public constructor(private readonly pool: Pool) {}

    /**
     * Starts a query for one PostgreSQL table.
     */
    public from(tableName: string): LocalPostgresTable {
        return new LocalPostgresTable(this.pool, tableName);
    }
}

/**
 * Supabase-shaped table entry point. Every operation starts a fresh query builder.
 */
class LocalPostgresTable {
    public constructor(
        private readonly pool: Pool,
        private readonly tableName: string,
    ) {}

    /**
     * Starts a select query.
     */
    public select(columns = '*', options?: LocalPostgresSelectOptions): LocalPostgresQueryBuilder {
        return new LocalPostgresQueryBuilder(this.pool, this.tableName).select(columns, options);
    }

    /**
     * Starts an insert query.
     */
    public insert(values: TODO_any): LocalPostgresQueryBuilder {
        return new LocalPostgresQueryBuilder(this.pool, this.tableName).insert(values);
    }

    /**
     * Starts an update query.
     */
    public update(values: Record<string, unknown>): LocalPostgresQueryBuilder {
        return new LocalPostgresQueryBuilder(this.pool, this.tableName).update(values);
    }

    /**
     * Starts a delete query.
     */
    public delete(): LocalPostgresQueryBuilder {
        return new LocalPostgresQueryBuilder(this.pool, this.tableName).delete();
    }

    /**
     * Starts an upsert query.
     */
    public upsert(values: TODO_any, options?: LocalPostgresUpsertOptions): LocalPostgresQueryBuilder {
        return new LocalPostgresQueryBuilder(this.pool, this.tableName).upsert(values, options);
    }
}

/**
 * Supabase-shaped thenable query builder executed by `await`.
 */
class LocalPostgresQueryBuilder implements PromiseLike<LocalPostgresQueryResult> {
    private operation: LocalPostgresOperation = 'select';
    private selectedColumns = '*';
    private selectOptions: LocalPostgresSelectOptions = {};
    private filters: Array<LocalPostgresFilter> = [];
    private orFilters: Array<string> = [];
    private orders: Array<LocalPostgresOrder> = [];
    private limitCount: number | null = null;
    private offsetCount: number | null = null;
    private singleMode: 'single' | 'maybeSingle' | null = null;
    private mutationRows: Array<Record<string, unknown>> = [];
    private mutationValues: Record<string, unknown> = {};
    private upsertOptions: LocalPostgresUpsertOptions = {};
    private signal: AbortSignal | null = null;
    private isReturningSelection = false;

    public constructor(
        private readonly pool: Pool,
        private readonly tableName: string,
    ) {}

    /**
     * Configures selected columns or mutation return columns.
     */
    public select(columns = '*', options: LocalPostgresSelectOptions = {}): this {
        if (this.operation !== 'select') {
            this.isReturningSelection = true;
        }

        this.selectedColumns = columns || '*';
        this.selectOptions = options;
        return this;
    }

    /**
     * Configures inserted rows.
     */
    public insert(values: TODO_any): this {
        this.operation = 'insert';
        this.mutationRows = normalizeMutationRows(values);
        return this;
    }

    /**
     * Configures updated values.
     */
    public update(values: Record<string, unknown>): this {
        this.operation = 'update';
        this.mutationValues = stripUndefinedValues(values);
        return this;
    }

    /**
     * Configures row deletion.
     */
    public delete(): this {
        this.operation = 'delete';
        return this;
    }

    /**
     * Configures inserted-or-updated rows.
     */
    public upsert(values: TODO_any, options: LocalPostgresUpsertOptions = {}): this {
        this.operation = 'upsert';
        this.mutationRows = normalizeMutationRows(values);
        this.upsertOptions = options;
        return this;
    }

    /**
     * Adds equality filter.
     */
    public eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'eq', value });
        return this;
    }

    /**
     * Adds inequality filter.
     */
    public neq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'neq', value });
        return this;
    }

    /**
     * Adds nullability filter.
     */
    public is(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'is', value });
        return this;
    }

    /**
     * Adds negative filter for supported operators.
     */
    public not(column: string, operator: string, value: unknown): this {
        if (operator === 'is') {
            this.filters.push({ column, operator: 'not-is', value });
        } else if (operator === 'eq') {
            this.filters.push({ column, operator: 'neq', value });
        }

        return this;
    }

    /**
     * Adds `IN` filter.
     */
    public in(column: string, value: ReadonlyArray<unknown>): this {
        this.filters.push({ column, operator: 'in', value });
        return this;
    }

    /**
     * Adds less-than filter.
     */
    public lt(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'lt', value });
        return this;
    }

    /**
     * Adds less-than-or-equal filter.
     */
    public lte(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'lte', value });
        return this;
    }

    /**
     * Adds greater-than filter.
     */
    public gt(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'gt', value });
        return this;
    }

    /**
     * Adds greater-than-or-equal filter.
     */
    public gte(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'gte', value });
        return this;
    }

    /**
     * Adds SQL LIKE filter.
     */
    public like(column: string, value: string): this {
        this.filters.push({ column, operator: 'like', value });
        return this;
    }

    /**
     * Adds case-insensitive LIKE filter.
     */
    public ilike(column: string, value: string): this {
        this.filters.push({ column, operator: 'ilike', value });
        return this;
    }

    /**
     * Adds an OR filter in the PostgREST format used by Supabase.
     */
    public or(filter: string): this {
        this.orFilters.push(filter);
        return this;
    }

    /**
     * Adds ordering.
     */
    public order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
        this.orders.push({
            column,
            ascending: options.ascending !== false,
            nullsFirst: options.nullsFirst,
        });
        return this;
    }

    /**
     * Adds a limit.
     */
    public limit(count: number): this {
        this.limitCount = count;
        return this;
    }

    /**
     * Adds inclusive range pagination.
     */
    public range(from: number, to: number): this {
        this.offsetCount = from;
        this.limitCount = Math.max(0, to - from + 1);
        return this;
    }

    /**
     * Marks the query as requiring exactly one row.
     */
    public single(): Promise<LocalPostgresQueryResult> {
        this.singleMode = 'single';
        return this.execute();
    }

    /**
     * Marks the query as requiring at most one row.
     */
    public maybeSingle(): Promise<LocalPostgresQueryResult> {
        this.singleMode = 'maybeSingle';
        return this.execute();
    }

    /**
     * Accepts an abort signal for API compatibility.
     */
    public abortSignal(signal: AbortSignal): this {
        this.signal = signal;
        return this;
    }

    /**
     * Makes the query builder awaitable.
     */
    public then<TResult1 = LocalPostgresQueryResult, TResult2 = never>(
        onfulfilled?: ((value: LocalPostgresQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    /**
     * Executes the configured query.
     */
    private async execute(): Promise<LocalPostgresQueryResult> {
        try {
            if (this.signal?.aborted) {
                throw new Error('The operation was aborted.');
            }

            switch (this.operation) {
                case 'insert':
                    return this.executeInsert();
                case 'update':
                    return this.executeUpdate();
                case 'delete':
                    return this.executeDelete();
                case 'upsert':
                    return this.executeUpsert();
                case 'select':
                default:
                    return this.executeSelect();
            }
        } catch (error) {
            return {
                data: null,
                error: normalizePostgresError(error),
                status: 400,
                statusText: 'Bad Request',
            };
        }
    }

    /**
     * Executes a select query.
     */
    private async executeSelect(): Promise<LocalPostgresQueryResult> {
        const selectedColumns = parseSelectedColumns(this.selectedColumns);
        const queryValues: Array<unknown> = [];
        const whereClause = this.createWhereClause(queryValues);
        const orderByClause = this.createOrderByClause();
        const limitClause = this.createLimitClause(queryValues);
        const count = this.selectOptions.count === 'exact' ? await this.executeCount(whereClause, queryValues) : null;

        if (this.selectOptions.head) {
            return {
                data: null,
                error: null,
                count,
                status: 200,
                statusText: 'OK',
            };
        }

        const result = await this.pool.query(
            [
                `SELECT ${createSelectExpression(selectedColumns)} FROM ${quoteIdentifier(this.tableName)}`,
                whereClause,
                orderByClause,
                limitClause,
            ]
                .filter(Boolean)
                .join(' '),
            queryValues,
        );

        return this.finalizeDataResponse(result.rows as Array<Record<string, unknown>>, count);
    }

    /**
     * Executes an insert query.
     */
    private async executeInsert(): Promise<LocalPostgresQueryResult> {
        if (this.mutationRows.length === 0) {
            return {
                data: null,
                error: null,
                status: 201,
                statusText: 'Created',
            };
        }

        const queryValues: Array<unknown> = [];
        const rows = this.mutationRows.map((row) => stripUndefinedValues(row));
        const columnNames = uniqueStrings(rows.flatMap((row) => Object.keys(row)));

        const valuesSql = rows
            .map((row) => {
                const placeholders = columnNames.map((column) =>
                    createPlaceholder(queryValues, normalizeDatabaseValue(column in row ? row[column] : null)),
                );
                return `(${placeholders.join(', ')})`;
            })
            .join(', ');

        const sql = [
            `INSERT INTO ${quoteIdentifier(this.tableName)} (${columnNames.map(quoteIdentifier).join(', ')})`,
            `VALUES ${valuesSql}`,
            this.createReturningClause(),
        ]
            .filter(Boolean)
            .join(' ');

        const result = await this.pool.query(sql, queryValues);
        return this.createMutationResponse(result.rows as Array<Record<string, unknown>>);
    }

    /**
     * Executes an update query.
     */
    private async executeUpdate(): Promise<LocalPostgresQueryResult> {
        const queryValues: Array<unknown> = [];
        const updateColumns = Object.keys(this.mutationValues);

        if (updateColumns.length === 0) {
            return this.createMutationResponse([]);
        }

        const assignments = updateColumns.map(
            (column) => `${quoteIdentifier(column)} = ${createPlaceholder(queryValues, normalizeDatabaseValue(this.mutationValues[column]))}`,
        );
        const whereClause = this.createWhereClause(queryValues);
        const result = await this.pool.query(
            [
                `UPDATE ${quoteIdentifier(this.tableName)} SET ${assignments.join(', ')}`,
                whereClause,
                this.createReturningClause(),
            ]
                .filter(Boolean)
                .join(' '),
            queryValues,
        );

        return this.createMutationResponse(result.rows as Array<Record<string, unknown>>);
    }

    /**
     * Executes a delete query.
     */
    private async executeDelete(): Promise<LocalPostgresQueryResult> {
        const queryValues: Array<unknown> = [];
        const whereClause = this.createWhereClause(queryValues);
        const result = await this.pool.query(
            [`DELETE FROM ${quoteIdentifier(this.tableName)}`, whereClause, this.createReturningClause()]
                .filter(Boolean)
                .join(' '),
            queryValues,
        );

        return this.createMutationResponse(result.rows as Array<Record<string, unknown>>);
    }

    /**
     * Executes an upsert query.
     */
    private async executeUpsert(): Promise<LocalPostgresQueryResult> {
        if (this.mutationRows.length === 0) {
            return {
                data: null,
                error: null,
                status: 201,
                statusText: 'Created',
            };
        }

        const rows = this.mutationRows.map((row) => stripUndefinedValues(row));
        const columnNames = uniqueStrings(rows.flatMap((row) => Object.keys(row)));
        const conflictColumns = resolveUpsertConflictColumns(resolveTableBaseName(this.tableName), this.upsertOptions);
        const queryValues: Array<unknown> = [];
        const valuesSql = rows
            .map((row) => {
                const placeholders = columnNames.map((column) =>
                    createPlaceholder(queryValues, normalizeDatabaseValue(column in row ? row[column] : null)),
                );
                return `(${placeholders.join(', ')})`;
            })
            .join(', ');
        const updateColumns = columnNames.filter((column) => column !== 'id');
        const updateAssignments = updateColumns.map(
            (column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`,
        );

        const onConflictClause =
            conflictColumns.length === 0
                ? ''
                : updateAssignments.length === 0
                  ? `ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`
                  : `ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO UPDATE SET ${updateAssignments.join(', ')}`;

        const sql = [
            `INSERT INTO ${quoteIdentifier(this.tableName)} (${columnNames.map(quoteIdentifier).join(', ')})`,
            `VALUES ${valuesSql}`,
            onConflictClause,
            this.createReturningClause(),
        ]
            .filter(Boolean)
            .join(' ');

        const result = await this.pool.query(sql, queryValues);
        return this.createMutationResponse(result.rows as Array<Record<string, unknown>>);
    }

    /**
     * Creates a mutation response, optionally loading selected mutated rows.
     */
    private createMutationResponse(rows: ReadonlyArray<Record<string, unknown>>): LocalPostgresQueryResult {
        if (!this.isReturningSelection) {
            return {
                data: null,
                error: null,
                status: 201,
                statusText: 'Created',
            };
        }

        return this.finalizeDataResponse([...rows], null);
    }

    /**
     * Applies single/maybeSingle response semantics.
     */
    private finalizeDataResponse(data: Array<Record<string, unknown>>, count: number | null): LocalPostgresQueryResult {
        if (this.singleMode === 'single') {
            if (data.length !== 1) {
                return {
                    data: null,
                    error: {
                        code: 'PGRST116',
                        message: `Expected exactly one row, received ${data.length}.`,
                    },
                    count,
                    status: 406,
                    statusText: 'Not Acceptable',
                };
            }

            return { data: data[0], error: null, count, status: 200, statusText: 'OK' };
        }

        if (this.singleMode === 'maybeSingle') {
            if (data.length > 1) {
                return {
                    data: null,
                    error: {
                        code: 'PGRST116',
                        message: `Expected zero or one row, received ${data.length}.`,
                    },
                    count,
                    status: 406,
                    statusText: 'Not Acceptable',
                };
            }

            return { data: data[0] || null, error: null, count, status: 200, statusText: 'OK' };
        }

        return { data, error: null, count, status: 200, statusText: 'OK' };
    }

    /**
     * Counts rows matching the current filters.
     */
    private async executeCount(whereClause: string, whereValues: ReadonlyArray<unknown>): Promise<number> {
        const result = await this.pool.query(
            [`SELECT COUNT(*)::INT AS "count" FROM ${quoteIdentifier(this.tableName)}`, whereClause].filter(Boolean).join(' '),
            [...whereValues],
        );

        return Number(result.rows[0]?.count || 0);
    }

    /**
     * Creates the SQL WHERE clause.
     */
    private createWhereClause(values: Array<unknown>): string {
        const parts: Array<string> = [];

        for (const filter of this.filters) {
            parts.push(createFilterCondition(filter, values));
        }

        for (const filter of this.orFilters) {
            const condition = createOrFilterCondition(filter, values);
            if (condition) {
                parts.push(condition);
            }
        }

        return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
    }

    /**
     * Creates the SQL ORDER BY clause.
     */
    private createOrderByClause(): string {
        if (this.orders.length === 0) {
            return '';
        }

        return `ORDER BY ${this.orders
            .map((order) => {
                const direction = order.ascending ? 'ASC' : 'DESC';
                const nullOrder =
                    order.nullsFirst === true ? ' NULLS FIRST' : order.nullsFirst === false ? ' NULLS LAST' : '';
                return `${quoteIdentifier(order.column)} ${direction}${nullOrder}`;
            })
            .join(', ')}`;
    }

    /**
     * Creates the SQL LIMIT/OFFSET clause.
     */
    private createLimitClause(values: Array<unknown>): string {
        if (this.limitCount === null) {
            return '';
        }

        if (this.offsetCount === null) {
            return `LIMIT ${createPlaceholder(values, this.limitCount)}`;
        }

        return `LIMIT ${createPlaceholder(values, this.limitCount)} OFFSET ${createPlaceholder(values, this.offsetCount)}`;
    }

    /**
     * Creates the SQL RETURNING clause for mutation queries.
     */
    private createReturningClause(): string {
        if (!this.isReturningSelection) {
            return '';
        }

        return `RETURNING ${createSelectExpression(parseSelectedColumns(this.selectedColumns))}`;
    }
}

/**
 * Creates SQL for one simple filter.
 */
function createFilterCondition(filter: LocalPostgresFilter, values: Array<unknown>): string {
    const column = quoteIdentifier(filter.column);
    const value = normalizeDatabaseValue(filter.value);

    switch (filter.operator) {
        case 'eq':
            return value === null ? `${column} IS NULL` : `${column} = ${createPlaceholder(values, value)}`;
        case 'neq':
            return value === null ? `${column} IS NOT NULL` : `${column} <> ${createPlaceholder(values, value)}`;
        case 'is':
            return filter.value === null ? `${column} IS NULL` : `${column} IS NOT DISTINCT FROM ${createPlaceholder(values, value)}`;
        case 'not-is':
            return filter.value === null ? `${column} IS NOT NULL` : `${column} IS DISTINCT FROM ${createPlaceholder(values, value)}`;
        case 'in': {
            const normalizedValues = Array.isArray(filter.value) ? filter.value.map(normalizeDatabaseValue) : [];
            if (normalizedValues.length === 0) {
                return 'FALSE';
            }

            return `${column} IN (${normalizedValues.map((normalizedValue) => createPlaceholder(values, normalizedValue)).join(', ')})`;
        }
        case 'lt':
            return `${column} < ${createPlaceholder(values, value)}`;
        case 'lte':
            return `${column} <= ${createPlaceholder(values, value)}`;
        case 'gt':
            return `${column} > ${createPlaceholder(values, value)}`;
        case 'gte':
            return `${column} >= ${createPlaceholder(values, value)}`;
        case 'like':
            return `${column} LIKE ${createPlaceholder(values, value)} ESCAPE '\\'`;
        case 'ilike':
            return `${column} ILIKE ${createPlaceholder(values, value)} ESCAPE '\\'`;
        default:
            return 'TRUE';
    }
}

/**
 * Creates SQL for one PostgREST `.or(...)` filter.
 */
function createOrFilterCondition(filter: string, values: Array<unknown>): string | null {
    const conditions: Array<string> = [];

    for (const part of splitPostgrestOrFilter(filter)) {
        const parsedFilter = parsePostgrestFilter(part);
        if (!parsedFilter) {
            continue;
        }

        if (parsedFilter.operator === 'cs') {
            conditions.push('FALSE');
            continue;
        }

        conditions.push(
            createFilterCondition(
                {
                    column: parsedFilter.column,
                    operator: normalizePostgrestOperator(parsedFilter.operator),
                    value: decodePostgrestFilterValue(parsedFilter.value),
                },
                values,
            ),
        );
    }

    if (conditions.length === 0) {
        return null;
    }

    return `(${conditions.join(' OR ')})`;
}

/**
 * Splits a PostgREST OR filter while keeping JSON literals intact.
 */
function splitPostgrestOrFilter(filter: string): Array<string> {
    const parts: Array<string> = [];
    let current = '';
    let depth = 0;
    let isInsideString = false;

    for (let index = 0; index < filter.length; index++) {
        const character = filter[index]!;
        const previousCharacter = filter[index - 1];

        if (character === '"' && previousCharacter !== '\\') {
            isInsideString = !isInsideString;
        } else if (!isInsideString && (character === '{' || character === '[')) {
            depth++;
        } else if (!isInsideString && (character === '}' || character === ']')) {
            depth--;
        }

        if (character === ',' && depth === 0 && !isInsideString) {
            parts.push(current);
            current = '';
            continue;
        }

        current += character;
    }

    if (current) {
        parts.push(current);
    }

    return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Parsed PostgREST filter expression.
 */
type ParsedPostgrestFilter = {
    readonly column: string;
    readonly operator: string;
    readonly value: string;
};

/**
 * Parses one PostgREST filter expression.
 */
function parsePostgrestFilter(filter: string): ParsedPostgrestFilter | null {
    const match = /^([^.]*)\.([a-z]+)\.([\s\S]*)$/iu.exec(filter.trim());
    if (!match) {
        return null;
    }

    return {
        column: match[1]!,
        operator: match[2]!.toLowerCase(),
        value: match[3]!,
    };
}

/**
 * Converts PostgREST operators into internal filter operators.
 */
function normalizePostgrestOperator(operator: string): LocalPostgresFilter['operator'] {
    switch (operator) {
        case 'neq':
            return 'neq';
        case 'ilike':
            return 'ilike';
        case 'like':
            return 'like';
        case 'lt':
            return 'lt';
        case 'lte':
            return 'lte';
        case 'gt':
            return 'gt';
        case 'gte':
            return 'gte';
        case 'eq':
        default:
            return 'eq';
    }
}

/**
 * Decodes a PostgREST filter value when URL-encoded by callers.
 */
function decodePostgrestFilterValue(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Creates a select expression from parsed columns.
 */
function createSelectExpression(columns: ReadonlyArray<string>): string {
    if (columns.length === 0 || columns.includes('*')) {
        return '*';
    }

    return columns.map(quoteIdentifier).join(', ');
}

/**
 * Parses a simple Supabase select column list.
 */
function parseSelectedColumns(columns: string): Array<string> {
    const trimmedColumns = columns.trim();
    if (!trimmedColumns || trimmedColumns === '*') {
        return ['*'];
    }

    return trimmedColumns
        .split(',')
        .map((column) => column.trim())
        .filter(Boolean)
        .map((column) => column.split(':').pop() || column)
        .map((column) => column.replace(/\s+/g, ''))
        .filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(column));
}

/**
 * Converts mutation payloads into a uniform array of records.
 */
function normalizeMutationRows(values: TODO_any): Array<Record<string, unknown>> {
    if (Array.isArray(values)) {
        return values.map((row) => stripUndefinedValues(row || {}));
    }

    return [stripUndefinedValues(values || {})];
}

/**
 * Removes undefined values because Supabase omits them from mutation payloads.
 */
function stripUndefinedValues(values: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Resolves a table base name from the actual prefixed table name.
 */
function resolveTableBaseName(tableName: string): string {
    const knownTableNames = uniqueStrings([...Array.from(DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE.keys()), '_Server']).sort(
        (left, right) => right.length - left.length,
    );

    return knownTableNames.find((knownTableName) => tableName.endsWith(knownTableName)) || tableName;
}

/**
 * Resolves upsert conflict columns.
 */
function resolveUpsertConflictColumns(
    tableBaseName: string,
    options: LocalPostgresUpsertOptions,
): ReadonlyArray<string> {
    if (options.onConflict) {
        return options.onConflict
            .split(',')
            .map((column) => column.trim())
            .filter(Boolean);
    }

    return DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE.get(tableBaseName) || [];
}

/**
 * Converts driver errors into Supabase-like errors.
 */
function normalizePostgresError(error: unknown): LocalPostgresError {
    if (typeof error === 'object' && error !== null) {
        const postgresError = error as { code?: unknown; details?: unknown; hint?: unknown; message?: unknown };
        return {
            code: typeof postgresError.code === 'string' ? postgresError.code : undefined,
            details: typeof postgresError.details === 'string' ? postgresError.details : undefined,
            hint: typeof postgresError.hint === 'string' ? postgresError.hint : undefined,
            message:
                typeof postgresError.message === 'string'
                    ? postgresError.message
                    : error instanceof Error
                      ? error.message
                      : String(error),
        };
    }

    return {
        message: error instanceof Error ? error.message : String(error),
    };
}

/**
 * Normalizes one bound value for PostgreSQL drivers.
 */
function normalizeDatabaseValue(value: unknown): unknown {
    return value === undefined ? null : value;
}

/**
 * Allocates the next positional placeholder.
 */
function createPlaceholder(values: Array<unknown>, value: unknown): string {
    values.push(value);
    return `$${values.length}`;
}

/**
 * Quotes one SQL identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Deduplicates strings while preserving order.
 */
function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    return Array.from(new Set(values.filter(Boolean)));
}
