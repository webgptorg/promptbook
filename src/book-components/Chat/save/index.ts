import { ChatSaveFormatDefinition } from './_common/ChatSaveFormatDefinition';
import { htmlSaveFormatDefinition } from './html/htmlSaveFormatDefinition';
import { jsonSaveFormatDefinition } from './json/jsonSaveFormatDefinition';
import { mdSaveFormatDefinition } from './markdown/mdSaveFormatDefinition';
import { txtSaveFormatDefinition } from './text/txtSaveFormatDefinition';
import { pdfSaveFormatDefinition } from './pdf/pdfSaveFormatDefinition';

/**
 * Registry of all built-in chat save plugins
 *
 * @public exported from `@promptbook/components`
 */
export const CHAT_SAVE_FORMATS = [
    jsonSaveFormatDefinition,
    txtSaveFormatDefinition,
    mdSaveFormatDefinition,
    htmlSaveFormatDefinition,
    pdfSaveFormatDefinition,
] as const satisfies ReadonlyArray<ChatSaveFormatDefinition>;


/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
