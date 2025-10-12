import type { ChatSaveFormatDefinition } from './_common/ChatSaveFormatDefinition';
import { htmlSaveFormatDefinition } from './html/htmlSaveFormatDefinition';
import { jsonSaveFormatDefinition } from './json/jsonSaveFormatDefinition';
import { mdSaveFormatDefinition } from './markdown/mdSaveFormatDefinition';
import { pdfSaveFormatDefinition } from './pdf/pdfSaveFormatDefinition';
import { reactSaveFormatDefinition } from './react/reactSaveFormatDefinition';
import { txtSaveFormatDefinition } from './text/txtSaveFormatDefinition';

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
    reactSaveFormatDefinition,
    pdfSaveFormatDefinition,
] as const satisfies ReadonlyArray<ChatSaveFormatDefinition>;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
