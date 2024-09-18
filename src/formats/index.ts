import { CsvFormatDefinition } from './csv/CsvFormatDefinition';
import { JsonFormatDefinition } from './json/JsonFormatDefinition';
import { TextFormatDefinition } from './text/TextFormatDefinition';
import { XmlFormatDefinition } from './xml/XmlFormatDefinition';

/**
 * Definitions for all formats supported by Promptbook
 *
 * @private internal index of `...` <- TODO [🏢]
 */
export const FORMAT_DEFINITIONS = [
    JsonFormatDefinition,
    XmlFormatDefinition,
    TextFormatDefinition,
    CsvFormatDefinition,
] as const;
