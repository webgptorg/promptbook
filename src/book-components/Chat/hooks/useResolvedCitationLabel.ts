'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CitationLabelResolver } from '../types/CitationLabelResolver';
import { getCitationLabel } from '../utils/citationHelpers';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';

/**
 * Resolved label state scoped to the citation key it belongs to.
 *
 * @private hook type of `<Chat/>`
 */
type ResolvedCitationLabelState = {
    readonly citationKey: string;
    readonly label: string;
};

/**
 * Cache of resolved citation labels keyed by stable citation metadata.
 *
 * @private hook constant of `<Chat/>`
 */
const RESOLVED_CITATION_LABELS_BY_KEY = new Map<string, string>();

/**
 * Creates a stable key for one citation label lookup.
 *
 * @param citation - Citation metadata.
 * @returns Stable citation key.
 *
 * @private hook helper of `<Chat/>`
 */
function createCitationLabelLookupKey(citation: ParsedCitation): string {
    return [citation.id, citation.source, citation.url || '', citation.title || '', citation.excerpt || ''].join('\n');
}

/**
 * Keeps a stable citation object while parent components recreate equivalent citation literals.
 *
 * @param citation - Citation metadata from the render tree.
 * @returns Citation lookup payload.
 *
 * @private hook helper of `<Chat/>`
 */
function createCitationLookupPayload(citation: ParsedCitation): ParsedCitation {
    return {
        id: citation.id,
        source: citation.source,
        url: citation.url,
        title: citation.title,
        excerpt: citation.excerpt,
    };
}

/**
 * Normalizes one resolved citation label before storing it.
 *
 * @param label - Raw resolver result.
 * @returns Trimmed label or null.
 *
 * @private hook helper of `<Chat/>`
 */
function normalizeResolvedCitationLabel(label: string | null | undefined): string | null {
    const normalizedLabel = label?.trim();

    return normalizedLabel || null;
}

/**
 * Creates and caches resolved label state for one citation key.
 *
 * @param citationKey - Stable citation lookup key.
 * @param label - Raw resolver result.
 * @returns Label state or null when the resolver did not provide a label.
 *
 * @private hook helper of `<Chat/>`
 */
function createResolvedCitationLabelState(
    citationKey: string,
    label: string | null | undefined,
): ResolvedCitationLabelState | null {
    const normalizedLabel = normalizeResolvedCitationLabel(label);
    if (!normalizedLabel) {
        return null;
    }

    RESOLVED_CITATION_LABELS_BY_KEY.set(citationKey, normalizedLabel);

    return {
        citationKey,
        label: normalizedLabel,
    };
}

/**
 * Reads one resolved label from the shared citation-label cache.
 *
 * @param citationKey - Stable citation lookup key.
 * @returns Cached label state or null.
 *
 * @private hook helper of `<Chat/>`
 */
function createCachedResolvedCitationLabelState(citationKey: string): ResolvedCitationLabelState | null {
    const cachedLabel = RESOLVED_CITATION_LABELS_BY_KEY.get(citationKey);

    return cachedLabel ? { citationKey, label: cachedLabel } : null;
}

/**
 * Resolves the best available label for one citation.
 *
 * @param citation - Citation metadata.
 * @param resolveCitationLabel - Optional async host resolver.
 * @returns Current label, starting with a synchronous fallback and updating when the resolver finishes.
 *
 * @private hook of `<Chat/>`
 */
export function useResolvedCitationLabel(
    citation: ParsedCitation,
    resolveCitationLabel?: CitationLabelResolver,
): string {
    const citationLookupPayload = useMemo(
        () => createCitationLookupPayload(citation),
        [citation.excerpt, citation.id, citation.source, citation.title, citation.url],
    );
    const fallbackLabel = useMemo(() => getCitationLabel(citationLookupPayload), [citationLookupPayload]);
    const citationKey = useMemo(() => createCitationLabelLookupKey(citationLookupPayload), [citationLookupPayload]);
    const [resolvedLabelState, setResolvedLabelState] = useState<ResolvedCitationLabelState | null>(() =>
        createCachedResolvedCitationLabelState(citationKey),
    );

    useEffect(() => {
        if (!resolveCitationLabel) {
            return;
        }

        const cachedLabelState = createCachedResolvedCitationLabelState(citationKey);
        if (cachedLabelState) {
            setResolvedLabelState((currentLabelState) =>
                currentLabelState?.citationKey === cachedLabelState.citationKey &&
                currentLabelState.label === cachedLabelState.label
                    ? currentLabelState
                    : cachedLabelState,
            );
            return;
        }

        let isCurrent = true;

        Promise.resolve(resolveCitationLabel(citationLookupPayload))
            .then((label) => {
                if (!isCurrent) {
                    return;
                }

                const nextLabelState = createResolvedCitationLabelState(citationKey, label);
                if (nextLabelState) {
                    setResolvedLabelState(nextLabelState);
                }
            })
            .catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [citationKey, citationLookupPayload, resolveCitationLabel]);

    const resolvedLabel =
        resolveCitationLabel && resolvedLabelState?.citationKey === citationKey ? resolvedLabelState.label : null;

    return resolvedLabel || fallbackLabel;
}
