/**
 * Removes comment lines (lines starting with #) from a system message
 * This is used to clean up the final system message before sending it to the AI model
 * while preserving the original content with comments in metadata
 *
 * @param systemMessage The system message that may contain comment lines
 * @returns The system message with comment lines removed
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function removeCommentsFromSystemMessage(systemMessage: string): string {
    if (!systemMessage) {
        return systemMessage;
    }

    const lines = systemMessage.split(/\r?\n/);
    const filteredLines = lines.filter((line) => {
        const trimmedLine = line.trim();
        // Remove lines that start with # (comments)
        return !trimmedLine.startsWith('#');
    });

    return filteredLines.join('\n').trim();
}
