'use client';

import type { ChatProps } from '@promptbook-local/components';

/**
 * Citation label resolver type accepted by the shared Chat component.
 *
 * @private utility type of Agents Server chat citations
 */
type AgentsServerCitationLabelResolver = NonNullable<ChatProps['resolveCitationLabel']>;

/**
 * Cache of in-flight and completed citation label lookups.
 *
 * @private utility constant of Agents Server chat citations
 */
const citationLabelCache = new Map<string, Promise<string | null>>();

/**
 * Pattern matching HTTP(S) URLs that the server can fetch.
 *
 * @private utility constant of Agents Server chat citations
 */
const HTTP_URL_REGEX = /^https?:\/\//i;

/**
 * Resolves nicer citation labels for Agents Server chat sources.
 *
 * @private utility of Agents Server chat citations
 */
export const resolveAgentsServerCitationLabel: AgentsServerCitationLabelResolver = async (citation) => {
    const title = normalizeCitationLabelResponse(citation.title);
    if (title) {
        return title;
    }

    if (!hasResolvableCitationTarget(citation.source, citation.url)) {
        return null;
    }

    const cacheKey = createCitationLabelCacheKey(citation.source, citation.url, citation.title);
    const cachedLabel = citationLabelCache.get(cacheKey);
    if (cachedLabel) {
        return cachedLabel;
    }

    const labelPromise = requestCitationLabel({
        source: citation.source,
        url: citation.url,
        title: citation.title,
    });
    citationLabelCache.set(cacheKey, labelPromise);

    return labelPromise;
};

/**
 * Requests one citation label from the server.
 *
 * @param payload - Citation metadata sent to the server resolver.
 * @returns Resolved label or null.
 *
 * @private utility of Agents Server chat citations
 */
async function requestCitationLabel(payload: {
    readonly source: string;
    readonly url?: string;
    readonly title?: string;
}): Promise<string | null> {
    const response = await fetch('/api/chat/citation-label', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response?.ok) {
        return null;
    }

    const body = (await response.json().catch(() => null)) as { label?: unknown } | null;

    return normalizeCitationLabelResponse(body?.label);
}

/**
 * Creates a stable cache key for one citation lookup.
 *
 * @param source - Citation source.
 * @param url - Optional resolved citation URL.
 * @param title - Optional title.
 * @returns Cache key.
 *
 * @private utility of Agents Server chat citations
 */
function createCitationLabelCacheKey(source: string, url?: string, title?: string): string {
    return [source, url || '', title || ''].join('\n');
}

/**
 * Checks whether a citation has a URL target worth resolving on the server.
 *
 * @param source - Citation source.
 * @param url - Optional resolved citation URL.
 * @returns True when the server can attempt a metadata lookup.
 *
 * @private utility of Agents Server chat citations
 */
function hasResolvableCitationTarget(source: string, url?: string): boolean {
    return HTTP_URL_REGEX.test(url || '') || HTTP_URL_REGEX.test(source);
}

/**
 * Normalizes one label value received from the server or structured citation metadata.
 *
 * @param value - Raw label value.
 * @returns Trimmed label or null.
 *
 * @private utility of Agents Server chat citations
 */
function normalizeCitationLabelResponse(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const label = value.replace(/\s+/g, ' ').trim();

    return label || null;
}
