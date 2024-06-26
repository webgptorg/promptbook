import { just } from '../../utils/just';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for XML format
 */
export const XmlFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'XML',

    mimeType: 'application/xml',

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
 * TODO: [🧠] Maybe propper instance of object
 * TODO: [0] Make string_serialized_xml
 * TODO: [1] Make type for XML Schema
 * TODO: [🧠] What to use for validating XMLs - XSD,...
 */
