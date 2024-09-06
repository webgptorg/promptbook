import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for list of multiple items
 *
 * Note: list is just a string with multiple lines or multiple items separated by comma
 *
 * @private still in development [🏢]
 */
export const ListFormatDefinition: FormatDefinition<string /* <- [0] */, string /* <- [👨‍⚖️] */, object /* <- [1] */> = {
    formatName: 'LIST',

    aliases: ['ARRAY', 'BULLETS'],

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

    extractValues(value, schema) {
        TODO_USE(value /* <- TODO: Use value here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        throw new Error('Not implemented');
    },
};

/**
 * TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages aviable as cells [🦥] - probbably change this to `TextFormatDefinition`
 * TODO: [🍓] In `ListFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `ListFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `ListFormatDefinition` implement `heal
 * TODO: [🍓] In `ListFormatDefinition` implement `subvalueDefinitions`
 * TODO: [🏢] Allow to expect something inside each item of list and other formats
 */
