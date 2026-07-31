/**
 * Creates a safe markdown fenced code block even when content contains backticks.
 *
 * @param content - Raw code content.
 * @param language - Optional info-string language label.
 * @returns Fenced code block.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function getSafeCodeBlock(content: string, language = 'markdown'): string {
    const maxBacktickCount = Math.max(0, ...(content.match(/`+/g) || []).map((match) => match.length));
    const fence = '`'.repeat(Math.max(3, maxBacktickCount + 1));
    return `${fence}${language}\n${content}\n${fence}`;
}
