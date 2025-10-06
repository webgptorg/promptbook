import { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * Markdown export plugin
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
