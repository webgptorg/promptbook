import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatDefinition } from '../_common/FormatDefinition';

/**
 * Definition for XML format
 *
 * @private still in development [🏢]
 */
export const XmlFormatDefinition: FormatDefinition<
    string /* <- [0] */,
    string /* <- [👨‍⚖️] */,
    TODO_any /* <- [1] */,
    TODO_any /* <- [1] */
> = {
    formatName: 'XML',

    mimeType: 'application/xml',

    isValid(value, settings, schema): value is string /* <- [0] */ {
        TODO_USE(value /* <- TODO: Use value here */);
        TODO_USE(settings /* <- TODO: Use settings here */);
        TODO_USE(schema /* <- TODO: Use schema here */);
        return true;
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

    subvalueDefinitions: [],
};

/**
 * TODO: [🧠] Maybe propper instance of object
 * TODO: [0] Make string_serialized_xml
 * TODO: [1] Make type for XML Settings and Schema
 * TODO: [🧠] What to use for validating XMLs - XSD,...
 * TODO: [🍓] In `XmlFormatDefinition` implement simple `isValid`
 * TODO: [🍓] In `XmlFormatDefinition` implement partial `canBeValid`
 * TODO: [🍓] In `XmlFormatDefinition` implement `heal
 * TODO: [🍓] In `XmlFormatDefinition` implement `subvalueDefinitions`
 * TODO: [🏢] Allow to expect something inside XML and other formats
 */
