/**
 * Quotes one SQLite identifier.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Creates a safe identifier suffix for generated index names.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function sanitizeSqlIdentifier(identifier: string): string {
    return identifier.replace(/[^A-Za-z0-9_]/g, '_');
}

/**
 * Creates a select expression from parsed columns.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function createSelectExpression(columns: ReadonlyArray<string>): string {
    if (columns.length === 0 || columns.includes('*')) {
        return '*';
    }

    return columns.map(quoteIdentifier).join(', ');
}

/**
 * Parses a simple Supabase select column list.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function parseSelectedColumns(columns: string): Array<string> {
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
 * Deduplicates strings while preserving order.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    return Array.from(new Set(values.filter(Boolean)));
}
