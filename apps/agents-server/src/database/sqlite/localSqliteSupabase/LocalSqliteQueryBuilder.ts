import type { TODO_any } from '@promptbook-local/types';
import type { AgentsServerSqliteDatabase } from '../$provideAgentsServerSqliteDatabase';
import type {
    LocalSqliteFilter,
    LocalSqliteOperation,
    LocalSqliteOrder,
    LocalSqliteQueryResult,
    LocalSqliteSelectOptions,
    LocalSqliteSqlFragment,
    LocalSqliteUpsertOptions,
} from './localSqliteTypes';
import { ensureTable } from './ensureTable';
import {
    createFilterCondition,
    createOrFilterCondition,
    parsePostgrestFilter,
    splitPostgrestOrFilter,
    type ParsedPostgrestFilter,
} from './localSqliteFilters';
import { normalizeMutationRows, stripUndefinedValues, withInsertDefaults } from './localSqliteMutationPayload';
import { findConflictRowid, insertRow, selectRowsByRowids, updateRowid } from './localSqliteRowOperations';
import { createSelectExpression, parseSelectedColumns, quoteIdentifier } from './localSqliteSql';
import { resolveTableBaseName, resolveUpsertConflictColumns } from './localSqliteTableSchema';
import { deserializeRow, serializeValue } from './localSqliteValueCodec';
import { normalizeSqliteError } from './normalizeSqliteError';

/**
 * Supabase-shaped thenable query builder executed by `await`.
 *
 * @private class of `$provideLocalSqliteSupabase`
 */
export class LocalSqliteQueryBuilder implements PromiseLike<LocalSqliteQueryResult> {
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
     */
    private executeCount(where: LocalSqliteSqlFragment): number {
        const row = this.database
            .prepare(`SELECT COUNT(*) AS "count" FROM ${quoteIdentifier(this.tableName)} ${where.sql}`)
            .get(...where.values);

        return Number(row?.count || 0);
    }

    /**
     * Selects matching SQLite rowids before a mutation changes filtered columns.
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
     */
    private createWhereClause(): LocalSqliteSqlFragment {
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
     *
     * @private method of `LocalSqliteQueryBuilder`
     */
    private createLimitClause(): LocalSqliteSqlFragment {
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
     *
     * @private method of `LocalSqliteQueryBuilder`
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
