import { stripMarkdownText } from '../utils/stripMarkdownText';

/**
 * Candidate text block evaluated by the ranking matcher.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchCandidate = {
    /**
     * Full text used for matching and scoring.
     */
    readonly text: string;

    /**
     * Optional text used for snippet generation when different from `text`.
     */
    readonly snippetText?: string;

    /**
     * Relative candidate importance.
     */
    readonly weight?: number;
};

/**
 * Match result returned by the text matcher.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchMatch = {
    /**
     * Numeric rank where bigger values are better.
     */
    readonly score: number;

    /**
     * UI-friendly context snippet.
     */
    readonly snippet: string;
};

/**
 * Minimum token length retained from user queries.
 */
const MIN_QUERY_TOKEN_LENGTH = 2;

/**
 * Default snippet size used across providers.
 */
const DEFAULT_SNIPPET_LENGTH = 180;

/**
 * Normalizes rich text into compact plain text suitable for matching.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function normalizeServerSearchText(value: string): string {
    return stripMarkdownText(value || '').replace(/\s+/g, ' ').trim();
}

/**
 * Splits a query string into normalized tokens.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function parseServerSearchQueryTokens(query: string): string[] {
    return normalizeServerSearchText(query)
        .toLowerCase()
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= MIN_QUERY_TOKEN_LENGTH);
}

/**
 * Creates one readable snippet around the first matched token.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function createServerSearchSnippet(text: string, queryTokens: readonly string[]): string {
    const normalizedText = normalizeServerSearchText(text);
    if (!normalizedText) {
        return '';
    }

    const lowered = normalizedText.toLowerCase();
    const firstIndex = queryTokens
        .map((token) => lowered.indexOf(token))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];

    if (firstIndex === undefined) {
        if (normalizedText.length <= DEFAULT_SNIPPET_LENGTH) {
            return normalizedText;
        }
        return `${normalizedText.slice(0, DEFAULT_SNIPPET_LENGTH - 1).trimEnd()}…`;
    }

    const start = Math.max(0, firstIndex - Math.floor(DEFAULT_SNIPPET_LENGTH * 0.35));
    const end = Math.min(normalizedText.length, start + DEFAULT_SNIPPET_LENGTH);
    const snippetCore = normalizedText.slice(start, end).trim();
    const prefix = start > 0 ? '…' : '';
    const suffix = end < normalizedText.length ? '…' : '';
    return `${prefix}${snippetCore}${suffix}`;
}

/**
 * Matches one query against multiple text candidates and returns the best score.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function createServerSearchMatcher(
    query: string,
    candidates: ReadonlyArray<ServerSearchCandidate>,
): ServerSearchMatch | null {
    const normalizedQuery = normalizeServerSearchText(query).toLowerCase();
    const queryTokens = parseServerSearchQueryTokens(query);

    if (normalizedQuery.length === 0 || queryTokens.length === 0 || candidates.length === 0) {
        return null;
    }

    let bestMatch: ServerSearchMatch | null = null;

    for (const candidate of candidates) {
        const text = normalizeServerSearchText(candidate.text);
        if (!text) {
            continue;
        }

        const loweredText = text.toLowerCase();
        const tokenIndexes: number[] = [];
        let matchesAllTokens = true;

        for (const token of queryTokens) {
            const tokenIndex = loweredText.indexOf(token);
            if (tokenIndex < 0) {
                matchesAllTokens = false;
                break;
            }
            tokenIndexes.push(tokenIndex);
        }

        if (!matchesAllTokens) {
            continue;
        }

        const firstTokenIndex = tokenIndexes.sort((left, right) => left - right)[0] ?? 0;
        const candidateWeight = candidate.weight ?? 1;
        let score = candidateWeight * 180;
        score += Math.max(0, 120 - firstTokenIndex);

        if (loweredText.startsWith(normalizedQuery)) {
            score += 180;
        } else if (loweredText.includes(` ${normalizedQuery}`)) {
            score += 80;
        }

        if (text.length <= 120) {
            score += 24;
        } else if (text.length <= 260) {
            score += 8;
        }

        const snippet = createServerSearchSnippet(candidate.snippetText || candidate.text, queryTokens);
        const match: ServerSearchMatch = { score, snippet };

        if (!bestMatch || match.score > bestMatch.score) {
            bestMatch = match;
        }
    }

    return bestMatch;
}
