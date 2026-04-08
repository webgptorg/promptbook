import { CsvFormatParser } from './csv/CsvFormatParser';
import { JsonFormatParser } from './json/JsonFormatParser';
import { TextFormatParser } from './text/TextFormatParser';
import { XmlFormatParser } from './xml/XmlFormatParser';

/**
 * Definitions for all formats supported by Promptbook
 *
 * @private internal index of `...` <- TODO [🏢]
 */
export const FORMAT_DEFINITIONS = [JsonFormatParser, XmlFormatParser, TextFormatParser, CsvFormatParser] as const;

// Note: [💞] Ignore a discrepancy between file name and entity name
