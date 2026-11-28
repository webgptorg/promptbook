/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { getCitationLabel } from '../utils/citationHelpers';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { useResolvedCitationLabel } from './useResolvedCitationLabel';

describe('useResolvedCitationLabel', () => {
    it('keeps a resolved label when the resolver identity changes for the same citation', async () => {
        const citation: ParsedCitation = {
            id: 'resolver-churn',
            source: 'https://example.com/knowledge/source-title',
        };
        const firstResolveCitationLabel = jest.fn(async () => 'Resolved Source Title');
        const secondResolveCitationLabel = jest.fn(async () => 'Resolved Source Title');
        const { result, rerender } = renderHook(
            ({ resolveCitationLabel }) => useResolvedCitationLabel(citation, resolveCitationLabel),
            {
                initialProps: {
                    resolveCitationLabel: firstResolveCitationLabel,
                },
            },
        );

        await waitFor(() => expect(result.current).toBe('Resolved Source Title'));

        rerender({ resolveCitationLabel: secondResolveCitationLabel });

        expect(result.current).toBe('Resolved Source Title');
        expect(secondResolveCitationLabel).not.toHaveBeenCalled();
    });

    it('uses the fallback label for a different unresolved citation', async () => {
        const firstCitation: ParsedCitation = {
            id: 'first-citation',
            source: 'https://example.com/knowledge/first-source',
        };
        const secondCitation: ParsedCitation = {
            id: 'second-citation',
            source: 'https://example.com/knowledge/second-source.pdf',
        };
        const unresolvedSecondCitationLabel = new Promise<string>(() => undefined);
        const resolveCitationLabel = jest
            .fn<(_: ParsedCitation) => Promise<string>>()
            .mockResolvedValueOnce('First Source Title')
            .mockReturnValueOnce(unresolvedSecondCitationLabel);
        const { result, rerender } = renderHook(
            ({ citation }) => useResolvedCitationLabel(citation, resolveCitationLabel),
            {
                initialProps: {
                    citation: firstCitation,
                },
            },
        );

        await waitFor(() => expect(result.current).toBe('First Source Title'));

        rerender({ citation: secondCitation });

        expect(result.current).toBe(getCitationLabel(secondCitation));
    });
});
