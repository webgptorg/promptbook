import type { ToolCall } from '../../../types/ToolCall';
import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseToolCallArguments(toolCall: Pick<ToolCall, 'arguments'>): Record<string, TODO_any> {
    if (!toolCall.arguments) {
        return {};
    }

    if (typeof toolCall.arguments === 'string') {
        try {
            const parsed = JSON.parse(toolCall.arguments);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    }

    return toolCall.arguments;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseToolCallResult(result: ToolCall['result']): TODO_any {
    if (typeof result !== 'string') {
        return result;
    }

    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

type SearchResultsExtraction = {
    results: Array<TODO_any>;
    rawText: string | null;
};

export type TeamToolResult = {
    teammate?: {
        url?: string;
        label?: string;
        instructions?: string;
        toolName?: string;
        pseudoAgentKind?: 'USER' | 'VOID';
    };
    request?: string;
    response?: string;
    interaction?: {
        kind?: string;
        prompt?: string;
    };
    /**
     * Tool calls executed by the teammate while answering.
     */
    toolCalls?: ReadonlyArray<ToolCall>;
    error?: string | null;
    conversation?: Array<{
        sender?: string;
        name?: string;
        role?: string;
        content?: string;
    }>;
};

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
 * @@@
 *
 * @private utility of `<Chat/>` component
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

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseTeamToolResult(resultRaw: TODO_any): TeamToolResult | null {
    if (!resultRaw || typeof resultRaw !== 'object') {
        return null;
    }

    const teammate = (resultRaw as TeamToolResult).teammate;
    if (!teammate || typeof teammate !== 'object') {
        return null;
    }

    return resultRaw as TeamToolResult;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function getToolCallTimestamp(toolCall: Pick<ToolCall, 'createdAt'>): Date | null {
    if (!toolCall.createdAt) {
        return null;
    }

    const date = new Date(toolCall.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function getToolCallResultDate(result: ToolCall['result']): Date | null {
    if (result === null || result === undefined) {
        return null;
    }

    if (typeof result === 'string' || typeof result === 'number') {
        const date = new Date(result);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof result === 'object') {
        const candidate =
            (result as Record<string, TODO_any>).time ??
            (result as Record<string, TODO_any>).timestamp ??
            (result as Record<string, TODO_any>).now;
        if (candidate) {
            return getToolCallResultDate(candidate);
        }
    }

    return null;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 *         <- TODO: But maybe split into multiple files later?
 */
