/**
 * Agent reference helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_URL_REFERENCE_REGEX = /https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/i;
const AGENT_REFERENCE_TOKEN_REGEX =
    /\{https?:\/\/[^\s{}]+\/agents\/[^\s{}]+\}|\{[A-Za-z0-9_-]{6,}\}|\{[^{}\r\n]*\s+[^{}\r\n]*\}|@[A-Za-z0-9_-]+|https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/g;
const AGENT_REFERENCE_BRACED_REGEX = /^\{([\s\S]+)\}$/;
const AGENT_REFERENCE_HIGHLIGHT_REGEXES = [
    /\{https?:\/\/[^\s{}]+\/agents\/[^\s{}]+\}/,
    /https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/,
    /\{[A-Za-z0-9_-]{6,}\}/,
    /\{[^{}\r\n]*\s+[^{}\r\n]*\}/,
    /@[A-Za-z0-9_-]+/,
] as const;

const extractAgentReferenceValue = (token: string): string => {
    if (token.startsWith('@')) {
        return token.slice(1).trim();
    }

    const bracedMatch = token.match(AGENT_REFERENCE_BRACED_REGEX);
    if (bracedMatch?.[1] !== undefined) {
        return bracedMatch[1].trim();
    }

    return token.trim();
};

const resolveAgentReferenceToUrl = (referenceValue: string): string | null => {
    const normalizedReferenceValue = referenceValue.replace(/[),.;!?]+$/g, '').trim();

    if (!normalizedReferenceValue) {
        return null;
    }

    if (AGENT_URL_REFERENCE_REGEX.test(normalizedReferenceValue)) {
        return normalizedReferenceValue;
    }

    if (normalizedReferenceValue.startsWith('http://') || normalizedReferenceValue.startsWith('https://')) {
        return null;
    }

    const encoded = encodeURIComponent(normalizedReferenceValue);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/agents/${encoded}`;
};

const extractAgentReferenceMatches = (content: string) => {
    type AgentReferenceMatch = {
        value: string;
        url: string;
        index: number;
        length: number;
    };

    const matches: AgentReferenceMatch[] = [];
    let match: RegExpExecArray | null;

    AGENT_REFERENCE_TOKEN_REGEX.lastIndex = 0;

    while ((match = AGENT_REFERENCE_TOKEN_REGEX.exec(content)) !== null) {
        const token = match[0];
        const index = match.index;

        if (!token || index === undefined) {
            continue;
        }

        if (token.startsWith('@') && index > 0) {
            const previousChar = content[index - 1] || '';
            if (/[A-Za-z0-9_.-]/.test(previousChar)) {
                continue;
            }
        }

        const value = extractAgentReferenceValue(token);
        const url = resolveAgentReferenceToUrl(value);

        if (!url) {
            continue;
        }

        matches.push({
            value,
            url,
            index,
            length: token.length,
        });
    }

    return matches;
};

/**
 * Agent reference helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export const BookEditorMonacoTokenization = {
    AGENT_URL_REFERENCE_REGEX,
    AGENT_REFERENCE_TOKEN_REGEX,
    AGENT_REFERENCE_BRACED_REGEX,
    AGENT_REFERENCE_HIGHLIGHT_REGEXES,
    extractAgentReferenceValue,
    resolveAgentReferenceToUrl,
    extractAgentReferenceMatches,
};
