import { just } from '../../utils/just';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for CSV spreadsheet
 */
export const CsvFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'CSV',

    aliases: ['SPREADSHEET', 'TABLE'],

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
 * TODO: [🍓] In `CsvFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement `heal
 * TODO: [🍓] In `CsvFormatDefinition` implement `extractValues`
 */