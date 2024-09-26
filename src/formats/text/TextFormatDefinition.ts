import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for any text - this will be always valid
 *
 * Note: This is not useful for validation, but for splitting and mapping with `subvalueDefinitions`
 *
 * @public exported from `@promptbook/core`
 */
export const TextFormatDefinition: FormatDefinition<string, string, TODO_any /* <- [1] */, TODO_any /* <- [1] */> = {
    formatName: 'TEXT',

    isValid(value: string): value is string {
        return typeof value === 'string';
    },

    canBeValid(partialValue: string): partialValue is string {
        return typeof partialValue === 'string';
    },

    heal() {
        throw new UnexpectedError('It does not make sense to call `TextFormatDefinition.heal`');
    },

    subvalueDefinitions: [
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
        // <- TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages aviable as subvalues
    ],
};

/**
 * TODO: [1] Make type for XML Text and Schema
 * TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages aviable as subvalues
 * TODO: [🍓] In `TextFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `TextFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `TextFormatDefinition` implement `heal
 * TODO: [🍓] In `TextFormatDefinition` implement `subvalueDefinitions`
 * TODO: [🏢] Allow to expect something inside each item of list and other formats
 */
