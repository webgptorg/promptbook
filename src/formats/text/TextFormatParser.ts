import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { FormatParser } from '../_common/FormatParser';

/**
 * Definition for any text - this will be always valid
 *
 * Note: This is not useful for validation, but for splitting and mapping with `subvalueParsers`
 *
 * @public exported from `@promptbook/core`
 */
export const TextFormatParser: FormatParser<string, string, TODO_any /* <- [1] */, TODO_any /* <- [1] */> = {
    formatName: 'TEXT',

    isValid(value: string): value is string {
        return typeof value === 'string';
    },

    canBeValid(partialValue: string): partialValue is string {
        return typeof partialValue === 'string';
    },

    heal() {
        throw new UnexpectedError('It does not make sense to call `TextFormatParser.heal`');
    },

    subvalueParsers: [
        {
            subvalueName: 'LINE',
            async mapValues(value, outputParameterName, settings, mapCallback) {
                const lines = value.split('\n');
                const mappedLines = await Promise.all(
                    lines.map((lineContent, lineNumber) =>
                        // TODO: [🧠] Maybe option to skip empty line
                        /* not await */ mapCallback(
                            {
                                lineContent,

                                // TODO: [🧠] Maybe also put here `lineNumber`
                            },
                            lineNumber,
                        ),
                    ),
                );
                return mappedLines.join('\n');
            },
        },
        // <- TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages available as subvalues
    ],
};

/**
 * TODO: [1] Make type for XML Text and Schema
 * TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages available as subvalues
 * TODO: [🍓] In `TextFormatParser` implement simple `isValid`
 * TODO: [🍓] In `TextFormatParser` implement partial `canBeValid`
 * TODO: [🍓] In `TextFormatParser` implement `heal
 * TODO: [🍓] In `TextFormatParser` implement `subvalueParsers`
 * TODO: [🏢] Allow to expect something inside each item of list and other formats
 */
