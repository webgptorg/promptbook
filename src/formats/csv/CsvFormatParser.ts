import { unparse } from 'papaparse';
import spaceTrim from 'spacetrim';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatParser } from '../_common/FormatParser';
import { CsvFormatError } from './CsvFormatError';
import type { CsvSettings } from './CsvSettings';
import { MANDATORY_CSV_SETTINGS } from './CsvSettings';
import { csvParse } from './utils/csvParse';
import { isValidCsvString } from './utils/isValidCsvString';

/**
 * Definition for CSV spreadsheet
 *
 * @public exported from `@promptbook/core`
 *                          <- TODO: [🏢] Export from package `@promptbook/csv`
 */
export const CsvFormatParser: FormatParser<
    string /* <- [0] */,
    string /* <- [👨‍⚖️] */,
    CsvSettings,
    TODO_any /* <- TODO: Make CSV Schemas */
> = {
    formatName: 'CSV',

    aliases: ['SPREADSHEET', 'TABLE'],

    isValid(value, settings, schema): value is string /* <- [0] */ {
        // TODO: Implement CSV validation
        TODO_USE(settings /* <- TODO: Use settings here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return isValidCsvString(value);
    },

    canBeValid(partialValue, settings, schema): partialValue is string /* <- [0] */ {
        TODO_USE(partialValue /* <- TODO: Use partialValue here */);
        TODO_USE(settings /* <- TODO: Use settings here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
    },

    heal(value, settings, schema) {
        TODO_USE(value /* <- TODO: Use partialValue here */);
        TODO_USE(settings /* <- TODO: Use settings here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        throw new Error('Not implemented');
    },

    subvalueParsers: [
        {
            subvalueName: 'ROW',
            async mapValues(options) {
                const { value, outputParameterName, settings, mapCallback, onProgress } = options;
                const csv = csvParse(value, settings);

                if (csv.errors.length !== 0) {
                    throw new CsvFormatError(
                        spaceTrim(
                            (block) => `
                                CSV parsing error

                                Error(s) from CSV parsing:
                                ${block(csv.errors.map((error) => error.message).join('\n\n'))}

                                The CSV setings:
                                ${block(JSON.stringify({ ...settings, ...MANDATORY_CSV_SETTINGS }, null, 2))}

                                The CSV data:
                                ${block(value)}
                            `,
                        ),
                    );
                }

                TODO_USE(
                    onProgress /* <- TODO: [🛕] Report progress here, report all the data including pending ones, use `PENDING_VALUE_PLACEHOLDER` */,
                );

                const mappedData: Record<string, TODO_any>[] = [];
                const length = csv.data.length;
                for (let index = 0; index < length; index++) {
                    const row = csv.data[index]!;
                    if (row[outputParameterName]) {
                        throw new CsvFormatError(
                            `Can not overwrite existing column "${outputParameterName}" in CSV row`,
                        );
                    }

                    const mappedRow: Record<string, TODO_any> = {
                        ...row,
                        [outputParameterName]: await mapCallback(row, index, length),
                    };
                    mappedData.push(mappedRow);

                    if (onProgress) {
                        // Note: Report the CSV with all rows mapped so far

                        /*
                        // TODO: [🛕] Report progress with all the rows including the pending ones
                          const progressData = mappedData.map((row, i) =>
                            i > index ? { ...row, [outputParameterName]: PENDING_VALUE_PLACEHOLDER } : row,
                        );
                        */
                        await onProgress(unparse(mappedData, { ...settings, ...MANDATORY_CSV_SETTINGS }));
                    }
                }

                return unparse(mappedData, { ...settings, ...MANDATORY_CSV_SETTINGS });
            },
        },
        {
            subvalueName: 'CELL',
            async mapValues(options) {
                const { value, settings, mapCallback, onProgress } = options;
                const csv = csvParse(value, settings);

                if (csv.errors.length !== 0) {
                    throw new CsvFormatError(
                        spaceTrim(
                            (block) => `
                                CSV parsing error

                                Error(s) from CSV parsing:
                                ${block(csv.errors.map((error) => error.message).join('\n\n'))}

                                The CSV setings:
                                ${block(JSON.stringify({ ...settings, ...MANDATORY_CSV_SETTINGS }, null, 2))}

                                The CSV data:
                                ${block(value)}
                            `,
                        ),
                    );
                }

                TODO_USE(
                    onProgress /* <- TODO: [🛕] Report progress here, report all the data including pending ones, use `PENDING_VALUE_PLACEHOLDER` */,
                );

                const mappedData = await Promise.all(
                    csv.data.map(async (row, rowIndex) => {
                        return /* not await */ Promise.all(
                            Object.entries(row).map(async ([key, value], columnIndex, array) => {
                                const index = rowIndex * Object.keys(row).length + columnIndex;
                                return /* not await */ mapCallback({ [key]: value }, index, array.length);
                            }),
                        );
                    }),
                );

                return unparse(mappedData, { ...settings, ...MANDATORY_CSV_SETTINGS });
            },
        },
    ],
};

/**
 * TODO: [🍓] In `CsvFormatParser` implement simple `isValid`
 * TODO: [🍓] In `CsvFormatParser` implement partial `canBeValid`
 * TODO: [🍓] In `CsvFormatParser` implement `heal
 * TODO: [🍓] In `CsvFormatParser` implement `subvalueParsers`
 * TODO: [🏢] Allow to expect something inside CSV objects and other formats
 */
