import type { ChatMessage } from '../types/ChatMessage';

/**
 * Supported chat export formats
 * @public exported from `@promptbook/components`
 */
export type ChatSaveFormat = 'json' | 'txt' | 'md' | 'html';

// TODO: !!!! Split save plugins into multiple files and folders

/**
 * Plugin contract for chat export formats
 * @public exported from `@promptbook/components`
 */
export type ChatSavePlugin = {
    format: ChatSaveFormat;
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
export const jsonSavePlugin: ChatSavePlugin = {
    format: 'json',
    label: 'JSON (full)',
    getContent: (messages) => JSON.stringify(messages, null, 2),
    mimeType: 'application/json',
    fileExtension: 'json',
};

/**
 * Plain text export plugin (messages only)
 *
 * @public exported from `@promptbook/components`
 */
export const txtSavePlugin: ChatSavePlugin = {
    format: 'txt',
    label: 'Plain Text',
    getContent: (messages) => messages.map((m) => m.content).join('\n\n---\n\n'),
    mimeType: 'text/plain',
    fileExtension: 'txt',
};

/**
 * Markdown export plugin (formatted)
 *
 * @public exported from `@promptbook/components`
 */
export const mdSavePlugin: ChatSavePlugin = {
    format: 'md',
    label: 'Markdown',
    getContent: (messages) => messages.map((m) => `**${m.from}:**\n\n${m.content}\n`).join('\n---\n'),
    mimeType: 'text/markdown',
    fileExtension: 'md',
};

/**
 * HTML export plugin (formatted)
 * @public exported from `@promptbook/components`
 */
export const htmlSavePlugin: ChatSavePlugin = {
    format: 'html',
    label: 'HTML',
    getContent: (messages) =>
        `<html><body>${messages.map((m) => `<strong>${m.from}:</strong><br>${m.content}<hr>`).join('')}</body></html>`,
    mimeType: 'text/html',
    fileExtension: 'html',
};

/**
 * Registry of all built-in chat save plugins
 *
 * @public exported from `@promptbook/components`
 */
export const chatSavePlugins: ChatSavePlugin[] = [jsonSavePlugin, txtSavePlugin, mdSavePlugin, htmlSavePlugin];

/**
 * Returns enabled chat save plugins filtered by formats (or all when omitted)
 *
 * @public exported from `@promptbook/components`
 */
export function getChatSavePlugins(formats?: ChatSaveFormat[]): ChatSavePlugin[] {
    if (!formats) return chatSavePlugins;
    return chatSavePlugins.filter((plugin) => formats.includes(plugin.format));
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
