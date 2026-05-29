import type { TODO_any } from '@promptbook-local/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { type Pool } from 'pg';
import { $provideAgentsServerPostgresPool } from './$provideAgentsServerPostgresPool';

/**
 * Minimal query result shape consumed by Agents Server Supabase call sites.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresQueryResult<TData = TODO_any> = {
    readonly data: TData | null;
    readonly error: LocalPostgresError | null;
    readonly count?: number | null;
    readonly status?: number;
    readonly statusText?: string;
};

/**
 * Supabase-like error shape returned by the direct PostgreSQL adapter.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresError = {
    readonly code?: string;
    readonly message: string;
    readonly details?: string;
    readonly hint?: string;
};

/**
 * Supported query operation kinds.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/**
 * Query filter captured from Supabase-like fluent calls.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'neq' | 'is' | 'not-is' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike';
    readonly value: unknown;
};

/**
 * Query order captured from Supabase-like fluent calls.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresOrder = {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst?: boolean;
};

/**
 * Select options supported by Supabase and used by this app.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresSelectOptions = {
    readonly count?: 'exact';
    readonly head?: boolean;
};

/**
 * Upsert options supported by Supabase and used by this app.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type LocalPostgresUpsertOptions = {
    readonly onConflict?: string;
};

/**
 * Parsed PostgREST filter expression.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
type ParsedPostgrestFilter = {
    readonly column: string;
    readonly operator: string;
    readonly value: string;
};

/**
 * Columns whose values are persisted as JSON text in Agents Server SQL adapters.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
const JSON_COLUMNS_BY_TABLE = new Map<string, ReadonlySet<string>>([
    ['Agent', new Set(['agentProfile', 'usage', 'preparedModelRequirements', 'preparedExternals'])],
    ['AgentHistory', new Set([])],
    ['ChatHistory', new Set(['message', 'usage'])],
    ['LlmCache', new Set(['value'])],
    ['VectorStoreKnowledgeSourceHashes', new Set([])],
    ['Image', new Set([])],
    ['File', new Set(['securityResult'])],
    ['Message', new Set(['sender', 'recipients', 'metadata'])],
    ['MessageSendAttempt', new Set(['raw'])],
    ['UserChat', new Set(['messages'])],
    ['UserChatJob', new Set(['parameters'])],
    ['UserChatTimeout', new Set(['parameters'])],
    ['UserData', new Set(['value'])],
    ['Wallet', new Set(['jsonSchema'])],
    ['ShareTargetPayload', new Set(['attachments'])],
    ['CalendarConnection', new Set(['scopes'])],
    ['CalendarActivity', new Set(['details'])],
]);

/**
 * Known unique conflict columns used when `.upsert` omits `onConflict`.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
const DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE = new Map<string, ReadonlyArray<string>>([
    ['AgentExternals', ['type', 'hash']],
    ['LlmCache', ['hash']],
    ['VectorStoreKnowledgeSourceHashes', ['source']],
    ['Metadata', ['key']],
    ['ServerLimit', ['key']],
]);

/**
 * Cached Supabase-shaped direct PostgreSQL client.
 *
 * @private internal PostgreSQL utility of Agents Server
 */
let localPostgresSupabase: SupabaseClient | null = null;

/**
 * Provides a Supabase-shaped client backed directly by PostgreSQL.
 *
 * @private exported from Agents Server PostgreSQL utilities
 */
export function $provideLocalPostgresSupabase(): SupabaseClient {
    if (localPostgresSupabase) {
        return localPostgresSupabase;
    }

    localPostgresSupabase = new LocalPostgresSupabaseClient($provideAgentsServerPostgresPool()) as unknown as SupabaseClient;
    return localPostgresSupabase;
}

/**
 * Resets the cached PostgreSQL adapter state for isolated tests.
 *
 * @private exported from Agents Server PostgreSQL utilities
 */
export async function $resetLocalPostgresSupabaseForTests(): Promise<void> {
    localPostgresSupabase = null;
}

/**
 * Supabase-shaped client with only the table query surface used by Agents Server.
 *
 * @private internal PostgreSQL utility of Agents Server
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
 *
 * @private internal PostgreSQL utility of Agents Server
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
 *
 * @private internal PostgreSQL utility of Agents Server
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
        const values: Array<unknown> = [];
        const where = this.createWhereClause(values);
        const orderBy = this.createOrderByClause();
        const count = this.selectOptions.count === 'exact' ? await this.executeCount(where, values) : null;
        const limit = this.createLimitClause(values);

        if (this.selectOptions.head) {
            return {
                data: null,
                error: null,
                count,
                status: 200,
                statusText: 'OK',
            };
        }

        const sql = [
            `SELECT ${createSelectExpression(selectedColumns)} FROM ${quoteIdentifier(this.tableName)}`,
            where,
            orderBy,
            limit,
        ]
            .filter(Boolean)
            .join(' ');
        const result = await this.pool.query(sql, values);
        const data = result.rows.map((row) => deserializeRow(this.tableName, row));

        return this.finalizeDataResponse(data, count);
    }

    /**
     * Executes an insert query.
     */
    private async executeInsert(): Promise<LocalPostgresQueryResult> {
        const selectedColumns = parseSelectedColumns(this.selectedColumns);
        const insertedRows: Array<Record<string, unknown>> = [];

        for (const rawRow of this.mutationRows) {
            const row = withInsertDefaults(resolveTableBaseName(this.tableName), rawRow);
            const columns = Object.keys(row).filter((column) => row[column] !== undefined);
            const values = columns.map((column) => serializeValue(this.tableName, column, row[column]));
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            const returningSql = this.isReturningSelection ? ` RETURNING ${createSelectExpression(selectedColumns)}` : '';
            const sql =
                columns.length === 0
                    ? `INSERT INTO ${quoteIdentifier(this.tableName)} DEFAULT VALUES${returningSql}`
                    : `INSERT INTO ${quoteIdentifier(this.tableName)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})${returningSql}`;
            const result = await this.pool.query(sql, values);
            insertedRows.push(...result.rows.map((insertedRow) => deserializeRow(this.tableName, insertedRow)));
        }

        return this.createMutationResponse(insertedRows);
    }

    /**
     * Executes an update query.
     */
    private async executeUpdate(): Promise<LocalPostgresQueryResult> {
        const updateColumns = Object.keys(this.mutationValues).filter((column) => this.mutationValues[column] !== undefined);

        if (updateColumns.length === 0) {
            return this.createMutationResponse(this.isReturningSelection ? await this.selectMatchingRows() : []);
        }

        const values = updateColumns.map((column) => serializeValue(this.tableName, column, this.mutationValues[column]));
        const assignments = updateColumns.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ');
        const whereValues = [...values];
        const where = this.createWhereClause(whereValues);
        const returningSelection = this.isReturningSelection ? ` RETURNING ${createSelectExpression(parseSelectedColumns(this.selectedColumns))}` : '';
        const sql = `UPDATE ${quoteIdentifier(this.tableName)} SET ${assignments} ${where}${returningSelection}`;
        const result = await this.pool.query(sql, whereValues);

        return this.createMutationResponse(result.rows.map((row) => deserializeRow(this.tableName, row)));
    }

    /**
     * Executes a delete query.
     */
    private async executeDelete(): Promise<LocalPostgresQueryResult> {
        const values: Array<unknown> = [];
        const where = this.createWhereClause(values);
        const returningSelection = this.isReturningSelection ? ` RETURNING ${createSelectExpression(parseSelectedColumns(this.selectedColumns))}` : '';
        const sql = `DELETE FROM ${quoteIdentifier(this.tableName)} ${where}${returningSelection}`;
        const result = await this.pool.query(sql, values);

        return this.createMutationResponse(result.rows.map((row) => deserializeRow(this.tableName, row)));
    }

    /**
     * Executes an upsert query.
     */
    private async executeUpsert(): Promise<LocalPostgresQueryResult> {
        const selectedColumns = parseSelectedColumns(this.selectedColumns);
        const affectedRows: Array<Record<string, unknown>> = [];
        const tableBaseName = resolveTableBaseName(this.tableName);
        const conflictColumns = resolveUpsertConflictColumns(tableBaseName, this.upsertOptions);

        for (const rawRow of this.mutationRows) {
            const row = withInsertDefaults(tableBaseName, rawRow);
            const columns = Object.keys(row).filter((column) => row[column] !== undefined);
            const insertValues = columns.map((column) => serializeValue(this.tableName, column, row[column]));
            const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
            const conflictSql = createUpsertConflictSql(columns, conflictColumns);
            const returningSql = this.isReturningSelection ? ` RETURNING ${createSelectExpression(selectedColumns)}` : '';
            const sql =
                columns.length === 0
                    ? `INSERT INTO ${quoteIdentifier(this.tableName)} DEFAULT VALUES${returningSql}`
                    : `INSERT INTO ${quoteIdentifier(this.tableName)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})${conflictSql}${returningSql}`;
            const result = await this.pool.query(sql, insertValues);
            affectedRows.push(...result.rows.map((affectedRow) => deserializeRow(this.tableName, affectedRow)));
        }

        return this.createMutationResponse(affectedRows);
    }

    /**
     * Creates a mutation response with optional selected rows.
     */
    private async createMutationResponse(rows: ReadonlyArray<Record<string, unknown>>): Promise<LocalPostgresQueryResult> {
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
    private finalizeDataResponse(
        data: Array<Record<string, unknown>>,
        count: number | null,
    ): LocalPostgresQueryResult {
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
    private async executeCount(where: string, values: ReadonlyArray<unknown>): Promise<number> {
        const row = await this.pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS "count" FROM ${quoteIdentifier(this.tableName)} ${where}`,
            [...values],
        );

        return Number(row.rows[0]?.count || 0);
    }

    /**
     * Selects rows matching the current filters.
     */
    private async selectMatchingRows(): Promise<Array<Record<string, unknown>>> {
        const values: Array<unknown> = [];
        const where = this.createWhereClause(values);
        const sql = `SELECT ${createSelectExpression(parseSelectedColumns(this.selectedColumns))} FROM ${quoteIdentifier(this.tableName)} ${where}`;
        const result = await this.pool.query(sql, values);
        return result.rows.map((row) => deserializeRow(this.tableName, row));
    }

    /**
     * Creates the SQL WHERE clause.
     */
    private createWhereClause(values: Array<unknown>): string {
        const parts: Array<string> = [];

        for (const filter of this.filters) {
            parts.push(createFilterCondition(this.tableName, filter, values));
        }

        for (const filter of this.orFilters) {
            const condition = createOrFilterCondition(this.tableName, filter, values);
            if (!condition) {
                continue;
            }

            parts.push(condition);
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

        const orderParts: Array<string> = [];
        for (const order of this.orders) {
            const quotedColumn = quoteIdentifier(order.column);
            const direction = order.ascending ? 'ASC' : 'DESC';

            if (order.nullsFirst === true) {
                orderParts.push(`${quotedColumn} ${direction} NULLS FIRST`);
                continue;
            }

            if (order.nullsFirst === false) {
                orderParts.push(`${quotedColumn} ${direction} NULLS LAST`);
                continue;
            }

            orderParts.push(`${quotedColumn} ${direction}`);
        }

        return `ORDER BY ${orderParts.join(', ')}`;
    }

    /**
     * Creates the SQL LIMIT/OFFSET clause.
     */
    private createLimitClause(values: Array<unknown>): string {
        if (this.limitCount === null) {
            return '';
        }

        values.push(this.limitCount);
        const limitPlaceholder = `$${values.length}`;

        if (this.offsetCount === null) {
            return `LIMIT ${limitPlaceholder}`;
        }

        values.push(this.offsetCount);
        return `LIMIT ${limitPlaceholder} OFFSET $${values.length}`;
    }
}

/**
 * Creates SQL for one simple filter.
 */
function createFilterCondition(tableName: string, filter: LocalPostgresFilter, values: Array<unknown>): string {
    const column = quoteIdentifier(filter.column);
    const value = serializeValue(tableName, filter.column, filter.value);

    switch (filter.operator) {
        case 'eq':
            if (value === null) {
                return `${column} IS NULL`;
            }
            values.push(value);
            return `${column} = $${values.length}`;
        case 'neq':
            if (value === null) {
                return `${column} IS NOT NULL`;
            }
            values.push(value);
            return `${column} <> $${values.length}`;
        case 'is':
            return filter.value === null ? `${column} IS NULL` : `${column} IS NOT DISTINCT FROM ${pushValue(values, value)}`;
        case 'not-is':
            return filter.value === null ? `${column} IS NOT NULL` : `${column} IS DISTINCT FROM ${pushValue(values, value)}`;
        case 'in': {
            const serializedValues = Array.isArray(filter.value)
                ? filter.value.map((item) => serializeValue(tableName, filter.column, item))
                : [];
            if (serializedValues.length === 0) {
                return '0 = 1';
            }
            return `${column} IN (${serializedValues.map((serializedValue) => pushValue(values, serializedValue)).join(', ')})`;
        }
        case 'lt':
            return `${column} < ${pushValue(values, value)}`;
        case 'lte':
            return `${column} <= ${pushValue(values, value)}`;
        case 'gt':
            return `${column} > ${pushValue(values, value)}`;
        case 'gte':
            return `${column} >= ${pushValue(values, value)}`;
        case 'like':
            return `${column} LIKE ${pushValue(values, value)} ESCAPE '\\'`;
        case 'ilike':
            return `${column} ILIKE ${pushValue(values, value)} ESCAPE '\\'`;
        default:
            return '1 = 1';
    }
}

/**
 * Creates SQL for one PostgREST `.or(...)` filter.
 */
function createOrFilterCondition(tableName: string, filter: string, values: Array<unknown>): string | null {
    const conditions: Array<string> = [];

    for (const part of splitPostgrestOrFilter(filter)) {
        const parsedFilter = parsePostgrestFilter(part);
        if (!parsedFilter) {
            continue;
        }

        if (parsedFilter.operator === 'cs') {
            conditions.push('0 = 1');
            continue;
        }

        conditions.push(
            createFilterCondition(
                tableName,
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
 * Creates the PostgreSQL `ON CONFLICT` clause for direct upserts.
 */
function createUpsertConflictSql(columns: ReadonlyArray<string>, conflictColumns: ReadonlyArray<string>): string {
    if (conflictColumns.length === 0) {
        return '';
    }

    const updatableColumns = columns.filter((column) => column !== 'id');
    if (updatableColumns.length === 0) {
        return ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`;
    }

    return ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO UPDATE SET ${updatableColumns
        .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
        .join(', ')}`;
}

/**
 * Pushes one bound value and returns its placeholder.
 */
function pushValue(values: Array<unknown>, value: unknown): string {
    values.push(value);
    return `$${values.length}`;
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
 * Adds adapter-side defaults that are normally supplied by migrations or higher-level flows.
 */
function withInsertDefaults(tableBaseName: string, row: Record<string, unknown>): Record<string, unknown> {
    const nowIso = new Date().toISOString();
    const result = { ...row };

    if (result.createdAt === undefined) {
        result.createdAt = nowIso;
    }
    if (result.updatedAt === undefined && tableBaseName !== 'AgentHistory' && tableBaseName !== 'ChatHistory') {
        result.updatedAt = nowIso;
    }

    switch (tableBaseName) {
        case 'Agent':
            result.visibility ??= 'PRIVATE';
            result.folderId ??= null;
            result.sortOrder ??= Date.now();
            result.deletedAt ??= null;
            result.preparedModelRequirements ??= null;
            break;
        case 'AgentFolder':
            result.parentId ??= null;
            result.sortOrder ??= Date.now();
            result.deletedAt ??= null;
            result.icon ??= null;
            result.color ??= null;
            break;
        case 'User':
            result.isAdmin ??= false;
            result.profileImageUrl ??= null;
            break;
        case 'UserChat':
            result.messages ??= [];
            result.source ??= 'WEB_UI';
            result.title ??= null;
            result.draftMessage ??= null;
            break;
        case 'UserChatJob':
            result.parameters ??= {};
            result.queuedAt ??= nowIso;
            result.attemptCount ??= 0;
            break;
        case 'UserChatTimeout':
            result.parameters ??= {};
            result.queuedAt ??= nowIso;
            result.attemptCount ??= 0;
            result.runCount ??= 0;
            break;
        case 'ApiTokens':
            result.isRevoked ??= false;
            break;
        case 'Wallet':
            result.isUserScoped ??= true;
            result.isGlobal ??= false;
            result.deletedAt ??= null;
            break;
        case 'UserMemory':
            result.isGlobal ??= false;
            result.deletedAt ??= null;
            break;
        case 'ShareTargetPayload':
            result.attachments ??= [];
            result.consumedAt ??= null;
            break;
        case 'UserPushSubscription':
            result.isChatFocused ??= false;
            break;
    }

    return result;
}

/**
 * Serializes one value for PostgreSQL storage.
 */
function serializeValue(tableName: string, column: string, value: unknown): unknown {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    if (isJsonColumn(tableName, column)) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    return value;
}

/**
 * Deserializes one PostgreSQL row into Supabase-like row values.
 */
function deserializeRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [column, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
            result[column] = null;
        } else if (isJsonColumn(tableName, column) && typeof value === 'string') {
            result[column] = parseJsonValue(value);
        } else {
            result[column] = value;
        }
    }

    return result;
}

/**
 * Parses JSON while preserving invalid strings.
 */
function parseJsonValue(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

/**
 * Resolves whether a column is JSON for a specific table.
 */
function isJsonColumn(tableName: string, column: string): boolean {
    return JSON_COLUMNS_BY_TABLE.get(resolveTableBaseName(tableName))?.has(column) || false;
}

/**
 * Resolves a table base name from the actual prefixed table name.
 */
function resolveTableBaseName(tableName: string): string {
    const knownTableNames = uniqueStrings([
        '_Server',
        ...Array.from(JSON_COLUMNS_BY_TABLE.keys()),
        ...Array.from(DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE.keys()),
        'AgentFolder',
        'CustomStylesheet',
        'CustomJavascript',
        'CalendarActivity',
    ]).sort((left, right) => right.length - left.length);

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
 * Converts PostgreSQL errors into Supabase-like errors.
 */
function normalizePostgresError(error: unknown): LocalPostgresError {
    if (typeof error === 'object' && error !== null) {
        const postgresError = error as {
            readonly code?: string;
            readonly message?: string;
            readonly detail?: string;
            readonly hint?: string;
        };

        return {
            code: postgresError.code,
            message: postgresError.message || String(error),
            details: postgresError.detail,
            hint: postgresError.hint,
        };
    }

    return {
        message: String(error),
    };
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
