import { parse, unparse } from 'papaparse';
import spaceTrim from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import type { Parameters } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';
import type { CsvSettings } from './CsvSettings';
import { MANDATORY_CSV_SETTINGS } from './CsvSettings';

/**
 * Definition for CSV spreadsheet
 *
 * @public exported from `@promptbook/core`
 *                          <- TODO: [🏢] Export from package `@promptbook/csv`
 */
export const CsvFormatDefinition: FormatDefinition<
    string /* <- [0] */,
    string /* <- [👨‍⚖️] */,
    CsvSettings,
    TODO_any /* <- TODO: Make CSV Schemas */
> = {
    formatName: 'CSV',

    aliases: ['SPREADSHEET', 'TABLE'],

    isValid(value, settings, schema): value is string /* <- [0] */ {
        // TODO: !!!!!! Implement CSV validation
        TODO_USE(value /* <- TODO: Use value here */);
        TODO_USE(settings /* <- TODO: Use settings here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
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

    subvalueDefinitions: [
        {
            subvalueName: 'ROW',
            async mapValues(value, outputParameterName, settings, mapCallback) {
                // TODO: [👨🏾‍🤝‍👨🏼] DRY csv parsing
                const csv = parse<Parameters>(value, { ...settings, ...MANDATORY_CSV_SETTINGS });

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
                    csv.data.map(async (row, index) => {
                        if (row[outputParameterName]) {
                            throw new ParseError( // <- TODO: !!!!!! Split PipelineParseError and FormatParseError -> CsvParseError
                                `Can not overwrite existing column "${outputParameterName}" in CSV row`,
                            );
                        }

                        return {
                            ...row,
                            [outputParameterName]: await mapCallback(row, index),
                        };
                    }),
                );

                return unparse(mappedData, { ...settings, ...MANDATORY_CSV_SETTINGS });
            },
        },
        {
            subvalueName: 'CELL',
            async mapValues(value, outputParameterName, settings, mapCallback) {
                // TODO: [👨🏾‍🤝‍👨🏼] DRY csv parsing
                const csv = parse<Parameters>(value, { ...settings, ...MANDATORY_CSV_SETTINGS });

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

                return unparse(mappedData, { ...settings, ...MANDATORY_CSV_SETTINGS });
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
