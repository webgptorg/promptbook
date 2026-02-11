/**
 * Matched compact agent reference token inside commitment content.
 */
export type AgentReferenceTokenMatch = {
    /**
     * Original token text, for example `{Agent Name}` or `@AgentId`.
     */
    readonly token: string;

    /**
     * Token payload used for lookup.
     */
    readonly reference: string;

    /**
     * Zero-based character offset of `token` in the scanned content.
     */
    readonly index: number;

    /**
     * Length of `token` in characters.
     */
    readonly length: number;
};

/**
 * Matches supported compact reference token syntaxes in commitment content.
 */
const AGENT_REFERENCE_TOKEN_REGEX = /(\{([^}]+)\}|@([A-Za-z0-9_-]+))/g;

/**
 * Extracts compact agent-reference tokens from commitment content.
 *
 * @param content - Commitment content to inspect.
 * @returns Matched compact reference tokens.
 */
export function extractAgentReferenceTokens(content: string): Array<AgentReferenceTokenMatch> {
    const matches: Array<AgentReferenceTokenMatch> = [];
    let match: RegExpExecArray | null;

    AGENT_REFERENCE_TOKEN_REGEX.lastIndex = 0;

    while ((match = AGENT_REFERENCE_TOKEN_REGEX.exec(content)) !== null) {
        const token = match[1];
        const reference = (match[2] ?? match[3] ?? '').trim();
        const index = match.index;

        if (!token || index === undefined) {
            continue;
        }

        matches.push({
            token,
            reference,
            index,
            length: token.length,
        });
    }

    return matches;
}
