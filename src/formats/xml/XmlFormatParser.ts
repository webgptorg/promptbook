import type { TODO_any } from '../../utils/organization/TODO_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { FormatParser } from '../_common/FormatParser';
import { isValidXmlString } from './utils/isValidXmlString';

/**
 * Definition for XML format
 *
 * @private still in development [🏢]
 */
export const XmlFormatParser: FormatParser<
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
        return isValidXmlString(value);
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

// TODO: [🧠] Maybe proper instance of object
// TODO: [0] Make string_serialized_xml
// TODO: [1] Make type for XML Settings and Schema
// TODO: [🧠] What to use for validating XMLs - XSD,...
// TODO: [🍓] In `XmlFormatParser` implement simple `isValid`
// TODO: [🍓] In `XmlFormatParser` implement partial `canBeValid`
// TODO: [🍓] In `XmlFormatParser` implement `heal
// TODO: [🍓] In `XmlFormatParser` implement `subvalueParsers`
// TODO: [🏢] Allow to expect something inside XML and other formats
