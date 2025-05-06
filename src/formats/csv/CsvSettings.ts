import type { ParseConfig, UnparseConfig } from 'papaparse';

/**
 * Settings and configuration options for CSV format handling within the application.
 */
export type CsvSettings = Pick<
    ParseConfig & UnparseConfig,
    'delimiter' | 'quoteChar' | 'newline' | 'skipEmptyLines'
    // <- TODO: List here more settings to configure CSV parsing
>;

/**
 * Contains configuration options for parsing and generating CSV files, such as delimiters and quoting rules.
 *
 * @public exported from `@promptbook/core`
 */
export const MANDATORY_CSV_SETTINGS = Object.freeze({
    header: true,
    // encoding: 'utf-8',
} as const) satisfies Omit<ParseConfig & UnparseConfig, keyof CsvSettings>;
