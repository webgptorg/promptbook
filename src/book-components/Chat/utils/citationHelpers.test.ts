import { describe, expect, it } from '@jest/globals';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from './parseCitationsFromContent';
import { getCitationLabel, isPlainTextCitation, resolveCitationPreviewUrl } from './citationHelpers';

describe('citation helper heuristics', () => {
    it('classifies multiline sentences as plain text and truncates the label to 30 chars', () => {
        const citation: ParsedCitation = {
            id: '0:0',
            source: 'Just some information, Roses are red, and secret code is 123.',
        };

        expect(isPlainTextCitation(citation)).toBe(true);
        expect(getCitationLabel(citation)).toBe('Just some information, Roses a…');
    });

    it('keeps document and URL citations out of the plain-text fallback', () => {
        expect(
            isPlainTextCitation({
                id: '0:1',
                source: 'document.pdf',
            }),
        ).toBe(false);

        expect(
            isPlainTextCitation({
                id: '0:2',
                source: 'https://example.com',
            }),
        ).toBe(false);
    });

    it('treats long single-word snippets without URLs/extensions as text', () => {
        expect(
            isPlainTextCitation({
                id: '0:3',
                source: 'LongTokenWithoutSpacesButLongerThanThirtyCharacters',
            }),
        ).toBe(true);

        expect(getCitationLabel({ id: '0:3', source: 'LongTokenWithoutSpacesButLongerThanThirtyCharacters' })).toBe(
            'LongTokenWithoutSpacesButLonge…',
        );
    });

    it('prefers the explicit url, then literal url, then knowledge sources for modal previews', () => {
        const participants: ReadonlyArray<ChatParticipant> = [
            {
                name: 'AGENT',
                knowledgeSources: [{ filename: 'doc.pdf', url: 'https://cdn.example/doc.pdf' }],
            },
        ];

        const knowledgeCitation: ParsedCitation = {
            id: '1:0',
            source: 'doc.pdf',
        };

        expect(resolveCitationPreviewUrl(knowledgeCitation, participants)).toBe('https://cdn.example/doc.pdf');

        const literalUrlCitation: ParsedCitation = {
            id: '1:1',
            source: 'https://example.com/resource',
        };

        expect(resolveCitationPreviewUrl(literalUrlCitation, participants)).toBe('https://example.com/resource');

        const explicitUrlCitation: ParsedCitation = {
            id: '1:2',
            source: 'doc.pdf',
            url: 'https://manual.example/doc.pdf',
        };

        expect(resolveCitationPreviewUrl(explicitUrlCitation, participants)).toBe(
            'https://manual.example/doc.pdf',
        );
    });
});
