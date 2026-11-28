/**
 * Removes single-hash comment lines (`# Comment`) from a system message
 * This is used to clean up the final system message before sending it to the AI model
 * while preserving the original content with comments in metadata
 *
 * @param systemMessage The system message that may contain comment lines
 * @returns The system message with single-hash comment lines removed
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
        // Remove only single-hash comment markers (`# Comment`) and keep markdown headings (`## Heading`).
        return !/^#(?!#)\s/.test(trimmedLine);
    });

    return filteredLines.join('\n').trim();
}
