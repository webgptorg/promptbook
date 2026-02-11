import { describe, expect, it } from '@jest/globals';
import {
    dedupeCitationsBySource,
    parseCitationsFromContent,
    stripCitationsFromContent,
} from './parseCitationsFromContent';
import { DEFAULT_SIMPLIFIED_CITATION_ID, normalizeCitationMarkersToFullNotation } from './parseCitationMarker';

describe('parseCitationsFromContent', () => {
    it('parses full notation citation markers', () => {
        const content = 'Answer with source 【7:15†document123.doc】.';

        expect(parseCitationsFromContent(content)).toEqual([
            {
                id: '7:15',
                source: 'document123.doc',
            },
        ]);
    });

    it('parses simplified notation citation markers', () => {
        const content = 'Answer with source 【document123.doc】.';

        expect(parseCitationsFromContent(content)).toEqual([
            {
                id: DEFAULT_SIMPLIFIED_CITATION_ID,
                source: 'document123.doc',
            },
        ]);
    });

    it('normalizes simplified notation to full notation', () => {
        const content = 'Answer with source 【document123.doc】.';

        expect(normalizeCitationMarkersToFullNotation(content)).toBe(
            `Answer with source 【${DEFAULT_SIMPLIFIED_CITATION_ID}†document123.doc】.`,
        );
    });
});

describe('stripCitationsFromContent', () => {
    it('strips both full and simplified citation markers', () => {
        const content =
            'One fact 【7:15†document123.doc】 and another fact 【document123.doc】 should hide markers only.';

        expect(stripCitationsFromContent(content)).toBe('One fact  and another fact  should hide markers only.');
    });
});

describe('dedupeCitationsBySource', () => {
    it('keeps one citation chip payload per source while preserving metadata', () => {
        const deduped = dedupeCitationsBySource([
            { id: '7:15', source: 'document123.doc' },
            { id: DEFAULT_SIMPLIFIED_CITATION_ID, source: 'document123.doc', url: 'https://example.com/document123.doc' },
        ]);

        expect(deduped).toEqual([
            {
                id: '7:15',
                source: 'document123.doc',
                url: 'https://example.com/document123.doc',
                excerpt: undefined,
            },
        ]);
    });
});
