import { parse, unparse } from 'papaparse';
import spaceTrim from 'spacetrim';
import type { Parameters } from '../../types/typeAliases';
import { ParseError } from '../../errors/ParseError';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for CSV spreadsheet
 *
 * @public exported from `@promptbook/core`
 *                          <- TODO: [🏢] Export from package `@promptbook/csv`
 */
export const CsvFormatDefinition: FormatDefinition<string /* <- [0] */, string /* <- [👨‍⚖️] */, object /* <- [1] */> = {
    formatName: 'CSV',

    aliases: ['SPREADSHEET', 'TABLE'],

    isValid(value, schema): value is string /* <- [0] */ {
        TODO_USE(value /* <- TODO: Use value here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
    },

    canBeValid(partialValue, schema): partialValue is string /* <- [0] */ {
        TODO_USE(partialValue /* <- TODO: Use partialValue here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
    },

    heal(value, schema) {
        TODO_USE(value /* <- TODO: Use partialValue here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        throw new Error('Not implemented');
    },

    subvalueDefinitions: [
        {
            subvalueName: 'ROW',
            async mapValues(value, mapCallback) {
                // TODO: [👨🏾‍🤝‍👨🏼] DRY csv parsing
                const csv = parse<Parameters>(value, {
                    header: true,
                    delimiter: ',',
                    quoteChar: '"',
                    newline: '\r\n',
                    skipEmptyLines: true,
                    // encoding: 'utf8',
                    // <- TODO: !!!!!! DEFAULT_CSV_OPTIONS
                    // <- TODO: [🧠] How to define parsing options for formats, its different concept than schema
                });

                if (csv.errors.length !== 0) {
                    throw new ParseError( // <- TODO: !!!!!! Split PipelineParseError and FormatParseError -> CsvParseError
                        spaceTrim(
                            (block) => `
                                CSV parsing error

                                ${block(csv.errors.map((error) => error.message).join('\n\n'))}
                            `,
                        ),
                    );
                }

                const mappedData = await Promise.all(
                    csv.data.map((row, index) => /*not await */ mapCallback(row, index)),
                );

                return unparse(mappedData, {
                    header: true,
                    delimiter: ',',
                    quoteChar: '"',
                    newline: '\r\n',
                    skipEmptyLines: true,
                    // encoding: 'utf8',
                    // <- TODO: !!!!!! DEFAULT_CSV_OPTIONS
                    // <- TODO: [🧠] How to define parsing options for formats, its different concept than schema
                });
            },
        },
        {
            subvalueName: 'CELL',
            async mapValues(value, mapCallback) {
                // TODO: [👨🏾‍🤝‍👨🏼] DRY csv parsing
                const csv = parse<Parameters>(value, {
                    header: true,
                    delimiter: ',',
                    quoteChar: '"',
                    newline: '\r\n',
                    skipEmptyLines: true,
                    // encoding: 'utf8',
                    // <- TODO: !!!!!! DEFAULT_CSV_OPTIONS
                    // <- TODO: [🧠] How to define parsing options for formats, its different concept than schema
                });

                if (csv.errors.length !== 0) {
                    throw new ParseError( // <- TODO: !!!!!! Split PipelineParseError and FormatParseError -> CsvParseError
                        spaceTrim(
                            (block) => `
                                CSV parsing error

                                ${block(csv.errors.map((error) => error.message).join('\n\n'))}
                            `,
                        ),
                    );
                }

                const mappedData = await Promise.all(
                    csv.data.map(async (row, rowIndex) => {
                        return /* not await */ Promise.all(
                            Object.entries(row).map(async ([key, value], columnIndex) => {
                                const index = rowIndex * Object.keys(row).length + columnIndex;
                                return /* not await */ mapCallback({ [key]: value }, index);
                            }),
                        );
                    }),
                );

                return unparse(mappedData, {
                    header: true,
                    delimiter: ',',
                    quoteChar: '"',
                    newline: '\r\n',
                    skipEmptyLines: true,
                    // encoding: 'utf8',
                    // <- TODO: !!!!!! DEFAULT_CSV_OPTIONS
                    // <- TODO: [🧠] How to define parsing options for formats, its different concept than schema
                });
            },
        },
    ],
};

/**
 * TODO: [🍓] In `CsvFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement `heal
 * TODO: [🍓] In `CsvFormatDefinition` implement `subvalueDefinitions`
 * TODO: [🏢] Allow to expect something inside CSV objects and other formats
 */
