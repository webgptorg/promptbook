import { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * HTML export plugin
 *
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
