/**
 * Appends one or more context sections to message content.
 *
 * @private function of appendChatAttachmentContext
 */
export function appendChatContextSections(messageContent: string, contextSections: ReadonlyArray<string>): string {
    const normalizedContextSections = contextSections
        .map((section) => section.trim())
        .filter((section) => section !== '');
    if (normalizedContextSections.length === 0) {
        return messageContent;
    }

    const normalizedMessageContent = messageContent.trimEnd();
    const separator = normalizedMessageContent === '' ? '' : '\n\n';
    return `${normalizedMessageContent}${separator}${normalizedContextSections.join('\n\n')}`;
}
