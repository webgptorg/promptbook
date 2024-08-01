import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for XML format
 */
export const XmlFormatDefinition: FormatDefinition<string /* <-[0] */, string /* <-[👨‍⚖️] */, object /* <-[1] */> = {
    name: 'XML',

    mimeType: 'application/xml',

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
 * TODO: [🧠] Maybe propper instance of object
 * TODO: [0] Make string_serialized_xml
 * TODO: [1] Make type for XML Schema
 * TODO: [🧠] What to use for validating XMLs - XSD,...
 * TODO: [🍓] In `XmlFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `XmlFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `XmlFormatDefinition` implement `heal
 * TODO: [🍓] In `XmlFormatDefinition` implement `extractValues`
 * TODO: [🏢] Allow to expect something inside XML and other formats
 */
