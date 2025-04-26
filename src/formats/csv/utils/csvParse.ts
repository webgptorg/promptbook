import type { ParseResult } from 'papaparse';
import { parse } from 'papaparse';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { Parameters } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { CsvSettings } from '../CsvSettings';
import { MANDATORY_CSV_SETTINGS } from '../CsvSettings';

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

    settings = { ...settings, ...MANDATORY_CSV_SETTINGS };

    // Note: Autoheal invalid '\n' characters
    if (settings.newline && !settings.newline.includes('\r') && value.includes('\r')) {
        console.warn(
            'CSV string contains carriage return characters, but in the CSV settings the `newline` setting does not include them. Autohealing the CSV string.',
        );

        value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    const csv = parse<Parameters>(value, settings);
    return csv;
}
