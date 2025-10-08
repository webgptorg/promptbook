
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
