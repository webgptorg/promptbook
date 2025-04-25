import type { ParseResult } from 'papaparse';
import { parse } from 'papaparse';
import { TODO_any } from '../../../_packages/types.index';
import { Parameters } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { CsvSettings, MANDATORY_CSV_SETTINGS } from '../CsvSettings';

/**
 * Converts a CSV string into an object
 *
 * Note: This is wrapper around `papaparse.parse()` with better autohealing
 *
 * @private - for now until `@promptbook/csv` is released
 */
export function csvParse(
    value: string /* <- TODO: string_csv */,
    settings?: CsvSettings,
    schema?: TODO_any /* <- TODO: Make CSV Schemas */,
): ParseResult<Parameters> {
    TODO_USE(schema /* <- TODO: Use schema here */);
    const csv = parse<Parameters>(value, { ...settings, ...MANDATORY_CSV_SETTINGS });
    return csv;
}
