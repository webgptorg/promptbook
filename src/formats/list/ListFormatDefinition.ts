import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for list of multiple items
 *
 * Note: list is just a string with multiple lines or multiple items separated by comma
 */
export const ListFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'LIST',

    aliases: ['ARRAY', 'BULLETS'],

    isValid(value, schema): value is string /* <-[0] */ {
        TODO_USE(value /* <- TODO: Use value here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
    },

    canBeValid(partialValue, schema): partialValue is string /* <-[0] */ {
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
 * TODO: [🍓] In `ListFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `ListFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `ListFormatDefinition` implement `heal
 * TODO: [🍓] In `ListFormatDefinition` implement `extractValues`
 * TODO: [🏢] Allow to expect something inside each item of list and other formats
 */
