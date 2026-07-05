import type { LocalSqliteFilter, LocalSqliteSqlFragment } from './localSqliteTypes';
import { quoteIdentifier } from './localSqliteSql';
import { serializeValue } from './localSqliteValueCodec';

/**
 * Parsed PostgREST filter expression.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type ParsedPostgrestFilter = {
    readonly column: string;
    readonly operator: string;
    readonly value: string;
};

/**
 * Creates SQL for one simple filter.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function createFilterCondition(tableName: string, filter: LocalSqliteFilter): LocalSqliteSqlFragment {
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
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function createOrFilterCondition(tableName: string, filter: string): LocalSqliteSqlFragment | null {
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
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function splitPostgrestOrFilter(filter: string): Array<string> {
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
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function parsePostgrestFilter(filter: string): ParsedPostgrestFilter | null {
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
 *
 * @private function of `createOrFilterCondition`
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
 *
 * @private function of `createOrFilterCondition`
 */
function decodePostgrestFilterValue(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
