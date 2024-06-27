import { just } from '../../utils/just';
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
        just(value /* <- TODO: Use value here */);
        just(schema /* <- TODO: Use schema here */);
        return true;
    },

    canBeValid(partialValue, schema): partialValue is string /* <-[0] */ {
        just(partialValue /* <- TODO: Use partialValue here */);
        just(schema /* <- TODO: Use schema here */);
        return true;
    },

    heal(value, schema) {
        just(value /* <- TODO: Use partialValue here */);
        just(schema /* <- TODO: Use schema here */);
        throw new Error('Not implemented');
    },
};


/**
 * TODO: [🍓] In `ListFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `ListFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `ListFormatDefinition` implement `heal
 * TODO: [🍓] In `ListFormatDefinition` implement `extractValues`
 */