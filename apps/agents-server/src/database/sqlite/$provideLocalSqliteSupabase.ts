import type { SupabaseClient } from '@supabase/supabase-js';
import type { TODO_any } from '@promptbook-local/types';
import {
    $provideAgentsServerSqliteDatabase,
    $resetAgentsServerSqliteDatabaseForTests,
    type AgentsServerSqliteDatabase,
} from './$provideAgentsServerSqliteDatabase';

/**
 * Minimal query result shape consumed by Agents Server Supabase call sites.
 */
type LocalSqliteQueryResult<TData = TODO_any> = {
    readonly data: TData | null;
    readonly error: LocalSqliteError | null;
    readonly count?: number | null;
    readonly status?: number;
    readonly statusText?: string;
};

/**
 * Supabase-like error shape returned by the local SQLite adapter.
 */
type LocalSqliteError = {
    readonly code?: string;
    readonly message: string;
    readonly details?: string;
    readonly hint?: string;
};

/**
 * Supported query operation kinds.
 */
type LocalSqliteOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/**
 * Query filter captured from Supabase-like fluent calls.
 */
type LocalSqliteFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'neq' | 'is' | 'not-is' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike';
    readonly value: unknown;
};

/**
 * Query order captured from Supabase-like fluent calls.
 */
type LocalSqliteOrder = {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst?: boolean;
};

/**
 * Select options supported by Supabase and used by this app.
 */
type LocalSqliteSelectOptions = {
    readonly count?: 'exact';
    readonly head?: boolean;
};

/**
 * Upsert options supported by Supabase and used by this app.
 */
type LocalSqliteUpsertOptions = {
    readonly onConflict?: string;
};

/**
 * Columns whose values are persisted as JSON text in local SQLite.
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
    ['ShibbolethUserIdentity', new Set(['rawAttributes'])],
    ['ShibbolethAuthenticationAttempt', new Set(['rawAttributes'])],
]);

/**
 * Boolean columns stored as integers by SQLite and restored as booleans.
 */
const BOOLEAN_COLUMNS = new Set(['isAdmin', 'isRevoked', 'isGlobal', 'isUserScoped', 'isSuccessful', 'isChatFocused']);

/**
 * Tables whose primary key is provided as text rather than generated numerically.
 */
const TEXT_PRIMARY_KEY_TABLES = new Set([
    'UserChat',
    'UserChatJob',
    'UserChatTimeout',
    'UserPushSubscription',
    'ShareTargetPayload',
]);

/**
 * Unique constraints required by common Supabase upsert and duplicate-detection flows.
 */
const UNIQUE_INDEX_COLUMNS_BY_TABLE = new Map<string, ReadonlyArray<ReadonlyArray<string>>>([
    ['_Server', [['name'], ['domain']]],
    ['Metadata', [['key']]],
    ['ServerLimit', [['key']]],
    ['Agent', [['permanentId']]],
    ['AgentExternals', [['type', 'hash']]],
    ['VectorStoreKnowledgeSourceHashes', [['source']]],
    ['User', [['username']]],
    ['ShibbolethUserIdentity', [['userId'], ['email'], ['nameId']]],
    ['UserChatJob', [['chatId', 'clientMessageId']]],
    ['LlmCache', [['hash']]],
    ['OpenAiAssistantCache', [['agentHash']]],
    ['ApiTokens', [['token']]],
    ['GenerationLock', [['lockKey']]],
    ['CustomStylesheet', [['scope']]],
    ['CustomJavascript', [['scope']]],
    ['Wallet', [['userId', 'agentPermanentId', 'service', 'key']]],
    ['UserData', [['userId', 'key']]],
    ['UserPushSubscription', [['endpoint']]],
]);

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
let localSqliteSupabase: SupabaseClient | null = null;

/**
 * Provides a Supabase-shaped client backed by a local SQLite database.
 */
export function $provideLocalSqliteSupabase(): SupabaseClient {
    if (localSqliteSupabase) {
        return localSqliteSupabase;
    }

    localSqliteSupabase = new LocalSqliteSupabaseClient(
        $provideAgentsServerSqliteDatabase(),
    ) as unknown as SupabaseClient;
    return localSqliteSupabase;
}

/**
 * Closes the cached SQLite connection and resets adapter state for isolated tests.
 */
export function $resetLocalSqliteSupabaseForTests(): void {
    $resetAgentsServerSqliteDatabaseForTests();
    localSqliteSupabase = null;
}

/**
 * Supabase-shaped client with only the table query surface used by Agents Server.
 */
class LocalSqliteSupabaseClient {
    public constructor(private readonly database: AgentsServerSqliteDatabase) {}

    /**
     * Starts a query for one SQLite table.
     */
    public from(tableName: string): LocalSqliteTable {
        return new LocalSqliteTable(this.database, tableName);
    }
}

/**
 * Supabase-shaped table entry point. Every operation starts a fresh query builder.
 */
class LocalSqliteTable {
    public constructor(private readonly database: AgentsServerSqliteDatabase, private readonly tableName: string) {}

    /**
     * Starts a select query.
     */
    public select(columns = '*', options?: LocalSqliteSelectOptions): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).select(columns, options);
    }

    /**
     * Starts an insert query.
     */
    public insert(values: TODO_any): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).insert(values);
    }

    /**
     * Starts an update query.
     */
    public update(values: Record<string, unknown>): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).update(values);
    }

    /**
     * Starts a delete query.
     */
    public delete(): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).delete();
    }

    /**
     * Starts an upsert query.
     */
    public upsert(values: TODO_any, options?: LocalSqliteUpsertOptions): LocalSqliteQueryBuilder {
        return new LocalSqliteQueryBuilder(this.database, this.tableName).upsert(values, options);
    }
}

/**
 * Supabase-shaped thenable query builder executed by `await`.
 */
class LocalSqliteQueryBuilder implements PromiseLike<LocalSqliteQueryResult> {
    private operation: LocalSqliteOperation = 'select';
    private selectedColumns = '*';
    private selectOptions: LocalSqliteSelectOptions = {};
    private filters: Array<LocalSqliteFilter> = [];
    private orFilters: Array<string> = [];
    private orders: Array<LocalSqliteOrder> = [];
    private limitCount: number | null = null;
    private offsetCount: number | null = null;
    private singleMode: 'single' | 'maybeSingle' | null = null;
    private mutationRows: Array<Record<string, unknown>> = [];
    private mutationValues: Record<string, unknown> = {};
    private upsertOptions: LocalSqliteUpsertOptions = {};
    private signal: AbortSignal | null = null;
    private isReturningSelection = false;

    public constructor(private readonly database: AgentsServerSqliteDatabase, private readonly tableName: string) {}

    /**
     * Configures selected columns or mutation return columns.
     */
    public select(columns = '*', options: LocalSqliteSelectOptions = {}): this {
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
    public upsert(values: TODO_any, options: LocalSqliteUpsertOptions = {}): this {
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
    public single(): Promise<LocalSqliteQueryResult> {
        this.singleMode = 'single';
        return this.execute();
    }

    /**
     * Marks the query as requiring at most one row.
     */
    public maybeSingle(): Promise<LocalSqliteQueryResult> {
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
    public then<TResult1 = LocalSqliteQueryResult, TResult2 = never>(
        onfulfilled?: ((value: LocalSqliteQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    /**
     * Executes the configured query.
     */
    private async execute(): Promise<LocalSqliteQueryResult> {
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
                error: normalizeSqliteError(error),
                status: 400,
                statusText: 'Bad Request',
            };
        }
    }

    /**
     * Executes a select query.
     */
    private executeSelect(): LocalSqliteQueryResult {
        const selectedColumns = parseSelectedColumns(this.selectedColumns);
        const requiredColumns = [
            ...selectedColumns,
            ...this.filters.map((filter) => filter.column),
            ...this.orders.map((order) => order.column),
            ...this.extractOrFilterColumns(),
        ];
        ensureTable(this.database, this.tableName, requiredColumns);

        const where = this.createWhereClause();
        const orderBy = this.createOrderByClause();
        const limit = this.createLimitClause();
        const count = this.selectOptions.count === 'exact' ? this.executeCount(where) : null;

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
            where.sql,
            orderBy,
            limit.sql,
        ]
            .filter(Boolean)
            .join(' ');
        const rows = this.database.prepare(sql).all(...where.values, ...limit.values);
        const data = rows.map((row) => deserializeRow(this.tableName, row));

        return this.finalizeDataResponse(data, count);
    }

    /**
     * Executes an insert query.
     */
    private executeInsert(): LocalSqliteQueryResult {
        const insertedRowids: Array<number | bigint> = [];

        for (const rawRow of this.mutationRows) {
            const row = withInsertDefaults(resolveTableBaseName(this.tableName), rawRow);
            ensureTable(this.database, this.tableName, Object.keys(row));
            insertedRowids.push(insertRow(this.database, this.tableName, row).lastInsertRowid);
        }

        return this.createMutationResponse(insertedRowids);
    }

    /**
     * Executes an update query.
     */
    private executeUpdate(): LocalSqliteQueryResult {
        const updateColumns = Object.keys(this.mutationValues);
        ensureTable(this.database, this.tableName, [
            ...updateColumns,
            ...this.filters.map((filter) => filter.column),
            ...this.extractOrFilterColumns(),
        ]);

        const rowids = this.selectMatchingRowids();

        if (rowids.length > 0 && updateColumns.length > 0) {
            const assignments = updateColumns.map((column) => `${quoteIdentifier(column)} = ?`).join(', ');
            const values = updateColumns.map((column) =>
                serializeValue(this.tableName, column, this.mutationValues[column]),
            );
            const rowidPlaceholders = rowids.map(() => '?').join(', ');
            this.database
                .prepare(
                    `UPDATE ${quoteIdentifier(
                        this.tableName,
                    )} SET ${assignments} WHERE rowid IN (${rowidPlaceholders})`,
                )
                .run(...values, ...rowids);
        }

        return this.createMutationResponse(rowids);
    }

    /**
     * Executes a delete query.
     */
    private executeDelete(): LocalSqliteQueryResult {
        ensureTable(this.database, this.tableName, [
            ...this.filters.map((filter) => filter.column),
            ...this.extractOrFilterColumns(),
        ]);

        const rowids = this.selectMatchingRowids();
        if (rowids.length > 0) {
            const rowidPlaceholders = rowids.map(() => '?').join(', ');
            this.database
                .prepare(`DELETE FROM ${quoteIdentifier(this.tableName)} WHERE rowid IN (${rowidPlaceholders})`)
                .run(...rowids);
        }

        return this.createMutationResponse([]);
    }

    /**
     * Executes an upsert query.
     */
    private executeUpsert(): LocalSqliteQueryResult {
        const affectedRowids: Array<number | bigint> = [];
        const tableBaseName = resolveTableBaseName(this.tableName);
        const conflictColumns = resolveUpsertConflictColumns(tableBaseName, this.upsertOptions);

        for (const rawRow of this.mutationRows) {
            const row = withInsertDefaults(tableBaseName, rawRow);
            ensureTable(this.database, this.tableName, [...Object.keys(row), ...conflictColumns]);
            const existingRowid =
                conflictColumns.length > 0
                    ? findConflictRowid(this.database, this.tableName, row, conflictColumns)
                    : null;

            if (existingRowid !== null) {
                updateRowid(this.database, this.tableName, existingRowid, row);
                affectedRowids.push(existingRowid);
            } else {
                affectedRowids.push(insertRow(this.database, this.tableName, row).lastInsertRowid);
            }
        }

        return this.createMutationResponse(affectedRowids);
    }

    /**
     * Creates a mutation response, optionally loading selected mutated rows.
     */
    private createMutationResponse(rowids: ReadonlyArray<number | bigint>): LocalSqliteQueryResult {
        if (!this.isReturningSelection) {
            return {
                data: null,
                error: null,
                status: 201,
                statusText: 'Created',
            };
        }

        const data = selectRowsByRowids(
            this.database,
            this.tableName,
            rowids,
            parseSelectedColumns(this.selectedColumns),
        );
        return this.finalizeDataResponse(data, null);
    }

    /**
     * Applies single/maybeSingle response semantics.
     */
    private finalizeDataResponse(data: Array<Record<string, unknown>>, count: number | null): LocalSqliteQueryResult {
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
    private executeCount(where: { readonly sql: string; readonly values: ReadonlyArray<unknown> }): number {
        const row = this.database
            .prepare(`SELECT COUNT(*) AS "count" FROM ${quoteIdentifier(this.tableName)} ${where.sql}`)
            .get(...where.values);

        return Number(row?.count || 0);
    }

    /**
     * Selects matching SQLite rowids before a mutation changes filtered columns.
     */
    private selectMatchingRowids(): Array<number | bigint> {
        const where = this.createWhereClause();
        const sql = `SELECT rowid AS "__rowid" FROM ${quoteIdentifier(this.tableName)} ${where.sql}`;
        return this.database
            .prepare(sql)
            .all(...where.values)
            .map((row) => row.__rowid as number | bigint);
    }

    /**
     * Creates the SQL WHERE clause.
     */
    private createWhereClause(): { readonly sql: string; readonly values: ReadonlyArray<unknown> } {
        const parts: Array<string> = [];
        const values: Array<unknown> = [];

        for (const filter of this.filters) {
            const condition = createFilterCondition(this.tableName, filter);
            parts.push(condition.sql);
            values.push(...condition.values);
        }

        for (const filter of this.orFilters) {
            const condition = createOrFilterCondition(this.tableName, filter);
            if (!condition) {
                continue;
            }

            parts.push(condition.sql);
            values.push(...condition.values);
        }

        return {
            sql: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '',
            values,
        };
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
                orderParts.push(`${quotedColumn} IS NOT NULL ASC`);
            } else if (order.nullsFirst === false) {
                orderParts.push(`${quotedColumn} IS NULL ASC`);
            }

            orderParts.push(`${quotedColumn} ${direction}`);
        }

        return `ORDER BY ${orderParts.join(', ')}`;
    }

    /**
     * Creates the SQL LIMIT/OFFSET clause.
     */
    private createLimitClause(): { readonly sql: string; readonly values: ReadonlyArray<unknown> } {
        if (this.limitCount === null) {
            return { sql: '', values: [] };
        }

        if (this.offsetCount === null) {
            return { sql: 'LIMIT ?', values: [this.limitCount] };
        }

        return { sql: 'LIMIT ? OFFSET ?', values: [this.limitCount, this.offsetCount] };
    }

    /**
     * Extracts column names referenced in OR filters.
     */
    private extractOrFilterColumns(): Array<string> {
        return this.orFilters.flatMap((filter) =>
            splitPostgrestOrFilter(filter)
                .map(parsePostgrestFilter)
                .filter((parsedFilter): parsedFilter is ParsedPostgrestFilter => parsedFilter !== null)
                .map((parsedFilter) => parsedFilter.column),
        );
    }
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
 * Ensures a table and all required columns exist.
 */
function ensureTable(
    database: AgentsServerSqliteDatabase,
    tableName: string,
    requiredColumns: ReadonlyArray<string>,
): void {
    const tableBaseName = resolveTableBaseName(tableName);
    const primaryKey = TEXT_PRIMARY_KEY_TABLES.has(tableBaseName)
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

    for (const column of columnsToEnsure) {
        if (existingColumns.has(column)) {
            continue;
        }

        database.exec(
            `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(column)} ${resolveSqliteColumnType(
                column,
            )}`,
        );
        existingColumns.add(column);
    }

    ensureUniqueIndexes(database, tableName, tableBaseName);
}

/**
 * Creates known unique indexes after required columns exist.
 */
function ensureUniqueIndexes(database: AgentsServerSqliteDatabase, tableName: string, tableBaseName: string): void {
    const uniqueIndexes = UNIQUE_INDEX_COLUMNS_BY_TABLE.get(tableBaseName) || [];

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
 * Inserts one row into the table.
 */
function insertRow(
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
 */
function updateRowid(
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
 */
function findConflictRowid(
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
 */
function selectRowsByRowids(
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

/**
 * Creates SQL for one simple filter.
 */
function createFilterCondition(
    tableName: string,
    filter: LocalSqliteFilter,
): { readonly sql: string; readonly values: ReadonlyArray<unknown> } {
    const column = quoteIdentifier(filter.column);
    const value = serializeValue(tableName, filter.column, filter.value);

    switch (filter.operator) {
        case 'eq':
            return value === null
                ? { sql: `${column} IS NULL`, values: [] }
                : { sql: `${column} = ?`, values: [value] };
        case 'neq':
            return value === null
                ? { sql: `${column} IS NOT NULL`, values: [] }
                : { sql: `${column} <> ?`, values: [value] };
        case 'is':
            return filter.value === null
                ? { sql: `${column} IS NULL`, values: [] }
                : { sql: `${column} IS ?`, values: [value] };
        case 'not-is':
            return filter.value === null
                ? { sql: `${column} IS NOT NULL`, values: [] }
                : { sql: `${column} IS NOT ?`, values: [value] };
        case 'in': {
            const values = Array.isArray(filter.value)
                ? filter.value.map((item) => serializeValue(tableName, filter.column, item))
                : [];
            if (values.length === 0) {
                return { sql: '0 = 1', values: [] };
            }
            return { sql: `${column} IN (${values.map(() => '?').join(', ')})`, values };
        }
        case 'lt':
            return { sql: `${column} < ?`, values: [value] };
        case 'lte':
            return { sql: `${column} <= ?`, values: [value] };
        case 'gt':
            return { sql: `${column} > ?`, values: [value] };
        case 'gte':
            return { sql: `${column} >= ?`, values: [value] };
        case 'like':
            return { sql: `${column} LIKE ? ESCAPE '\\'`, values: [value] };
        case 'ilike':
            return { sql: `LOWER(${column}) LIKE LOWER(?) ESCAPE '\\'`, values: [value] };
        default:
            return { sql: '1 = 1', values: [] };
    }
}

/**
 * Creates SQL for one PostgREST `.or(...)` filter.
 */
function createOrFilterCondition(
    tableName: string,
    filter: string,
): { readonly sql: string; readonly values: ReadonlyArray<unknown> } | null {
    const conditions: Array<string> = [];
    const values: Array<unknown> = [];

    for (const part of splitPostgrestOrFilter(filter)) {
        const parsedFilter = parsePostgrestFilter(part);
        if (!parsedFilter) {
            continue;
        }

        if (parsedFilter.operator === 'cs') {
            conditions.push('0 = 1');
            continue;
        }

        const condition = createFilterCondition(tableName, {
            column: parsedFilter.column,
            operator: normalizePostgrestOperator(parsedFilter.operator),
            value: decodePostgrestFilterValue(parsedFilter.value),
        });
        conditions.push(condition.sql);
        values.push(...condition.values);
    }

    if (conditions.length === 0) {
        return null;
    }

    return {
        sql: `(${conditions.join(' OR ')})`,
        values,
    };
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
function normalizePostgrestOperator(operator: string): LocalSqliteFilter['operator'] {
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
 * Adds SQLite-side defaults that are normally supplied by PostgreSQL migrations.
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
            result.email ??= null;
            result.displayName ??= null;
            result.authenticationProvider ??= 'LOCAL';
            break;
        case 'ShibbolethUserIdentity':
            result.displayName ??= null;
            result.nameId ??= null;
            result.nameIdFormat ??= null;
            result.unstructuredName ??= null;
            result.eduPersonPrincipalName ??= null;
            result.rawAttributes ??= null;
            result.lastLoggedInAt ??= null;
            result.loginCount ??= 0;
            break;
        case 'ShibbolethAuthenticationAttempt':
            result.userId ??= null;
            result.email ??= null;
            result.displayName ??= null;
            result.nameId ??= null;
            result.relayState ??= null;
            result.ip ??= null;
            result.userAgent ??= null;
            result.errorMessage ??= null;
            result.rawAttributes ??= null;
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
 * Serializes one value for SQLite storage.
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
    if (BOOLEAN_COLUMNS.has(column)) {
        return value ? 1 : 0;
    }
    return value;
}

/**
 * Deserializes one SQLite row into Supabase-like row values.
 */
function deserializeRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [column, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
            result[column] = null;
        } else if (isJsonColumn(tableName, column) && typeof value === 'string') {
            result[column] = parseJsonValue(value);
        } else if (BOOLEAN_COLUMNS.has(column)) {
            result[column] = Boolean(value);
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
 * Resolves SQLite column affinity for dynamically added columns.
 */
function resolveSqliteColumnType(column: string): string {
    if (BOOLEAN_COLUMNS.has(column)) {
        return 'INTEGER';
    }
    if (
        column === 'id' ||
        column.endsWith('Id') ||
        column.endsWith('Count') ||
        column.endsWith('Ms') ||
        column.endsWith('Bytes') ||
        column === 'sortOrder' ||
        column === 'attemptCount' ||
        column === 'runCount' ||
        column === 'value'
    ) {
        return 'INTEGER';
    }

    return 'TEXT';
}

/**
 * Resolves a table base name from the actual prefixed table name.
 */
function resolveTableBaseName(tableName: string): string {
    const knownTableNames = uniqueStrings([
        '_Server',
        ...Array.from(JSON_COLUMNS_BY_TABLE.keys()),
        ...Array.from(UNIQUE_INDEX_COLUMNS_BY_TABLE.keys()),
        ...Array.from(TEXT_PRIMARY_KEY_TABLES),
        'AgentFolder',
        'CustomStylesheet',
        'CustomJavascript',
        'CalendarActivity',
    ]).sort((left, right) => right.length - left.length);

    return knownTableNames.find((knownTableName) => tableName.endsWith(knownTableName)) || tableName;
}

/**
 * Resolves columns participating in known unique indexes.
 */
function resolveUniqueIndexColumns(tableBaseName: string): Array<string> {
    return (UNIQUE_INDEX_COLUMNS_BY_TABLE.get(tableBaseName) || []).flatMap((columns) => [...columns]);
}

/**
 * Resolves upsert conflict columns.
 */
function resolveUpsertConflictColumns(tableBaseName: string, options: LocalSqliteUpsertOptions): ReadonlyArray<string> {
    if (options.onConflict) {
        return options.onConflict
            .split(',')
            .map((column) => column.trim())
            .filter(Boolean);
    }

    return DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE.get(tableBaseName) || [];
}

/**
 * Converts SQLite errors into Supabase-like errors.
 */
function normalizeSqliteError(error: unknown): LocalSqliteError {
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

/**
 * Quotes one SQLite identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Creates a safe identifier suffix for generated index names.
 */
function sanitizeSqlIdentifier(identifier: string): string {
    return identifier.replace(/[^A-Za-z0-9_]/g, '_');
}

/**
 * Deduplicates strings while preserving order.
 */
function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    return Array.from(new Set(values.filter(Boolean)));
}
