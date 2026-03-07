/**
 * Extracts short title text from flattened conversation content.
 *
 * @param messageText Flattened conversation text.
 * @returns Human-friendly title candidate.
 * @private function of createDefaultServerSearchProviders
 */
export function extractConversationTitle(messageText: string): string {
    const firstSentence =
        messageText
            .split(/[.!?]/)
            .map((segment) => segment.trim())
            .find(Boolean) || '';
    if (!firstSentence) {
        return '';
    }

    if (firstSentence.length <= 72) {
        return firstSentence;
    }

    return `${firstSentence.slice(0, 71).trimEnd()}…`;
}
