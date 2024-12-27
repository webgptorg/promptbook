import type { ParseConfig, UnparseConfig } from 'papaparse';

/**
 * @@@
 */
export type CsvSettings = Pick<
    ParseConfig & UnparseConfig,
    'delimiter' | 'quoteChar' | 'newline' | 'skipEmptyLines'
    // <- TODO: List here more settings to configure CSV parsing
>;

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const MANDATORY_CSV_SETTINGS = Object.freeze({
    header: true,
    // encoding: 'utf-8',
} as const) satisfies Omit<ParseConfig & UnparseConfig, keyof CsvSettings>;
