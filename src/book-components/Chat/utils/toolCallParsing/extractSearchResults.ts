import type { TODO_any } from '../../../../utils/organization/TODO_any';

/**
 * Normalized search extraction result for chat rendering.
 *
 * @private type of extractSearchResults
 */
type SearchResultsExtraction = {
    results: Array<TODO_any>;
    rawText: string | null;
};

/**
 * Parses list-like markdown search output into normalized records.
 *
 * @param text - Raw search text.
 * @returns Parsed search records.
 * @private function of extractSearchResults
 */
function parseSearchResultsFromText(text: string): Array<TODO_any> {
    const results: Array<TODO_any> = [];
    const normalized = text.replace(/\r\n/g, '\n');
    const lines = normalized.split(/\r?\n/);
    const urlPattern = /(https?:\/\/[^\s]+)/i;
    let current: { title?: string; url?: string; snippetParts: string[] } | null = null;

    const flush = () => {
        if (!current || !current.title) {
            current = null;
            return;
        }
        const snippet = current.snippetParts
            .map((part) => part.trim())
            .filter(Boolean)
            .join(' ');
        results.push({
            title: current.title,
            url: current.url,
            snippet,
        });
        current = null;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        const titleMatch = trimmed.match(/^- \*\*(.+?)\*\*$/);
        if (titleMatch) {
            flush();
            current = { title: titleMatch[1]?.trim(), snippetParts: [] };
            continue;
        }

        if (!current) {
            continue;
        }

        if (!current.url) {
            const urlMatch = trimmed.match(urlPattern);
            if (urlMatch) {
                current.url = urlMatch[1];
                const remainder = trimmed.replace(urlMatch[0], '').trim();
                if (remainder) {
                    current.snippetParts.push(remainder);
                }
                continue;
            }
        }

        current.snippetParts.push(trimmed);
    }

    flush();

    return results;
}

/**
 * Attempts to parse search results from JSON-like strings.
 *
 * @param text - JSON candidate text.
 * @returns Parsed result list or `null`.
 * @private function of extractSearchResults
 */
function parseSearchResultsFromJson(text: string): Array<TODO_any> | null {
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.results)) {
            return parsed.results;
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Extracts search result arrays from known object response shapes.
 *
 * @param resultRaw - Raw object payload.
 * @returns Extracted result list.
 * @private function of extractSearchResults
 */
function getResultsFromObject(resultRaw: Record<string, TODO_any>): Array<TODO_any> {
    if (Array.isArray(resultRaw.results)) {
        return resultRaw.results;
    }
    if (resultRaw.result) {
        const subResult = resultRaw.result;
        if (Array.isArray(subResult)) {
            return subResult;
        }
        if (subResult && typeof subResult === 'object' && Array.isArray(subResult.results)) {
            return subResult.results;
        }
        if (typeof subResult === 'string') {
            const parsed = parseSearchResultsFromJson(subResult);
            if (parsed) {
                return parsed;
            }
        }
    }
    if (Array.isArray(resultRaw.data)) {
        return resultRaw.data;
    }
    if (Array.isArray(resultRaw.items)) {
        return resultRaw.items;
    }

    return [];
}

/**
 * Finds textual search output in known object response fields.
 *
 * @param resultRaw - Raw object payload.
 * @returns Raw text or `null`.
 * @private function of extractSearchResults
 */
function getRawSearchText(resultRaw: Record<string, TODO_any>): string | null {
    const candidates = [
        resultRaw.result,
        resultRaw.results,
        resultRaw.data,
        resultRaw.items,
        resultRaw.content,
        resultRaw.text,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }

    return null;
}

/**
 * Extracts search results and optional raw text from mixed payload formats.
 *
 * @param resultRaw - Raw search tool output.
 * @returns Normalized extraction object.
 * @private function of toolCallParsing
 */
export function extractSearchResults(resultRaw: TODO_any): SearchResultsExtraction {
    if (Array.isArray(resultRaw)) {
        return { results: resultRaw, rawText: null };
    }

    if (typeof resultRaw === 'string') {
        return { results: parseSearchResultsFromText(resultRaw), rawText: resultRaw };
    }

    if (resultRaw && typeof resultRaw === 'object') {
        const results = getResultsFromObject(resultRaw);
        const rawText = getRawSearchText(resultRaw);

        if (results.length > 0) {
            return { results, rawText };
        }

        if (rawText) {
            const parsedFromText = parseSearchResultsFromText(rawText);
            return { results: parsedFromText, rawText };
        }

        return { results, rawText };
    }

    return { results: [], rawText: null };
}
