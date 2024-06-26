import { JsonFormatDefinition } from './json/JsonFormatDefinition';
import { ListFormatDefinition } from './list/ListFormatDefinition';
import { XmlFormatDefinition } from './xml/XmlFormatDefinition';

/**
 * Definitions for all formats supported by Promptbook
 */
export const FORMAT_DEFINITIONS = [JsonFormatDefinition, XmlFormatDefinition, ListFormatDefinition];
