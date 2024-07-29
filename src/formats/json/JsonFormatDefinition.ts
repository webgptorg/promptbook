import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';
import { isValidJsonString } from './utils/isValidJsonString';

/**
 * Definition for JSON format
 */
export const JsonFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'JSON',

    mimeType: 'application/json',

    isValid(value, schema): value is string /* <-[0] */ {
        TODO_USE(schema /* <- TODO: Use schema here */);
        return isValidJsonString(value);
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
 * TODO: [🧠] Maybe propper instance of object
 * TODO: [0] Make string_serialized_json
 * TODO: [1] Make type for JSON Schema
 * TODO: [🧠] What to use for validating JSONs - JSON Schema, ZoD, typescript types/interfaces,...?
 * TODO: [🍓] In `JsonFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `JsonFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `JsonFormatDefinition` implement `heal
 * TODO: [🍓] In `JsonFormatDefinition` implement `extractValues`
 */
