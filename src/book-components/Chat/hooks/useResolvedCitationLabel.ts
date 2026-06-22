'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CitationLabelResolver } from '../types/CitationLabelResolver';
import { getCitationLabel } from '../utils/citationHelpers';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';

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
    const fallbackLabel = useMemo(() => getCitationLabel(citation), [citation]);
    const citationKey = useMemo(() => createCitationLabelLookupKey(citation), [citation]);
    const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

    useEffect(() => {
        setResolvedLabel(null);

        if (!resolveCitationLabel) {
            return;
        }

        let isCurrent = true;

        Promise.resolve(resolveCitationLabel(citation))
            .then((label) => {
                if (!isCurrent) {
                    return;
                }

                const normalizedLabel = label?.trim();
                if (normalizedLabel) {
                    setResolvedLabel(normalizedLabel);
                }
            })
            .catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [citation, citationKey, resolveCitationLabel]);

    return resolvedLabel || fallbackLabel;
}
