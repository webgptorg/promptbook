import { string_file_extension, string_mime_type } from '../../../types/typeAliases';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Supported chat export formatNames
 * @public exported from `@promptbook/components`
 */
export type ChatSaveFormatName = typeof CHAT_SAVE_FORMATS[number]['formatName'];

// TODO: !!!! Split save plugins into multiple files and folders

/**
 * Plugin contract for chat export formatNames
 * @public exported from `@promptbook/components`
 */
export type ChatSaveFormatDefinition = {
    formatName: string_file_extension | string_mime_type | string;
    label: string;
    getContent: (messages: ChatMessage[]) => string;
    mimeType: string;
    fileExtension: string;
};

/**
 * JSON export plugin (full metadata)
 *
 * @public exported from `@promptbook/components`
 */
export const jsonSaveFormatDefinition = {
    formatName: 'json',
    label: 'JSON (full)',
    getContent: (messages) => JSON.stringify(messages, null, 2),
    mimeType: 'application/json',
    fileExtension: 'json',
} as const satisfies ChatSaveFormatDefinition;

/**
 * Plain text export plugin (messages only)
 *
 * @public exported from `@promptbook/components`
 */
export const txtSaveFormatDefinition = {
    formatName: 'txt',
    label: 'Plain Text',
    getContent: (messages) => messages.map((m) => m.content).join('\n\n---\n\n'),
    mimeType: 'text/plain',
    fileExtension: 'txt',
} as const satisfies ChatSaveFormatDefinition;

/**
 * Markdown export plugin (formatNameted)
 *
 * @public exported from `@promptbook/components`
 */
export const mdSaveFormatDefinition = {
    formatName: 'md',
    label: 'Markdown',
    getContent: (messages) => messages.map((m) => `**${m.from}:**\n\n${m.content}\n`).join('\n---\n'),
    mimeType: 'text/markdown',
    fileExtension: 'md',
} as const satisfies ChatSaveFormatDefinition;

/**
 * HTML export plugin (formatNameted)
 * @public exported from `@promptbook/components`
 */
export const htmlSaveFormatDefinition = {
    formatName: 'html',
    label: 'HTML',
    getContent: (messages) =>
        `<html><body>${messages.map((m) => `<strong>${m.from}:</strong><br>${m.content}<hr>`).join('')}</body></html>`,
    mimeType: 'text/html',
    fileExtension: 'html',
} as const satisfies ChatSaveFormatDefinition;

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
] as const satisfies ReadonlyArray<ChatSaveFormatDefinition>;

/**
 * Returns enabled chat save plugins filtered by formatNames (or all when omitted)
 *
 * @public exported from `@promptbook/components`
 */
export function getChatSaveFormatDefinitions(
    formatNames?: ReadonlyArray<ChatSaveFormatName>,
): ReadonlyArray<ChatSaveFormatDefinition> {
    if (!formatNames) {
        return CHAT_SAVE_FORMATS;
    }
    return CHAT_SAVE_FORMATS.filter((saveFormatDefinition) => formatNames.includes(saveFormatDefinition.formatName));
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
