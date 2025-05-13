import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatParser } from '../_common/FormatParser';
import { isValidJsonString } from './utils/isValidJsonString';

/**
 * Definition for JSON format
 *
 * @private still in development [🏢]
 */
export const JsonFormatParser: FormatParser<
    string /* <- [0] */,
    string /* <- [👨‍⚖️] */,
    TODO_any /* <- [1] */,
    TODO_any /* <- [1] */
> = {
    formatName: 'JSON',

    mimeType: 'application/json',

    isValid(value, settings, schema): value is string /* <- [0] */ {
        TODO_USE(schema /* <- TODO: Use schema here */);
        TODO_USE(settings /* <- TODO: Use settings here */);
        return isValidJsonString(value);
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

    subvalueParsers: [],
};

/**
 * TODO: [🧠] Maybe proper instance of object
 * TODO: [0] Make string_serialized_json
 * TODO: [1] Make type for JSON Settings and Schema
 * TODO: [🧠] What to use for validating JSONs - JSON Schema, ZoD, typescript types/interfaces,...?
 * TODO: [🍓] In `JsonFormatParser` implement simple `isValid`
 * TODO: [🍓] In `JsonFormatParser` implement partial `canBeValid`
 * TODO: [🍓] In `JsonFormatParser` implement `heal
 * TODO: [🍓] In `JsonFormatParser` implement `subvalueParsers`
 * TODO: [🏢] Allow to expect something inside JSON objects and other formats
 */
