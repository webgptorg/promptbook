import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for CSV spreadsheet
 */
export const CsvFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'CSV',

    aliases: ['SPREADSHEET', 'TABLE'],

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
 * TODO: [🍓] In `CsvFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `CsvFormatDefinition` implement `heal
 * TODO: [🍓] In `CsvFormatDefinition` implement `extractValues`
 */
