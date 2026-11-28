import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * JSON export plugin (full metadata)
 *
 * @public exported from `@promptbook/components`
 */
export const jsonSaveFormatDefinition = {
    formatName: 'json',
    label: 'Json',
    getContent: ({ messages }) => JSON.stringify(messages, null, 2),
    mimeType: 'application/json',
    fileExtension: 'json',
} as const satisfies ChatSaveFormatDefinition;
