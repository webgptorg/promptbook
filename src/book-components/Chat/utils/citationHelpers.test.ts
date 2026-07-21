import { describe, expect, it } from '@jest/globals';
import type { ChatParticipant } from '../types/ChatParticipant';
import { createReadableCitationSourceLabel, getCitationLabel, isPlainTextCitation, resolveCitationPreviewUrl } from './citationHelpers';
import type { ParsedCitation } from './parseCitationsFromContent';

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

    it('prefers structured citation titles over source-derived labels', () => {
        expect(
            getCitationLabel({
                id: '0:4',
                source: 'https://example.com/documents/annual-report-2020.pdf',
                title: 'Annual Report 2020',
            }),
        ).toBe('Annual Report 2020');
    });

    it('creates readable fallback labels from URLs and filenames', () => {
        expect(createReadableCitationSourceLabel('https://example.com/documents/annual_report_2020.pdf')).toBe(
            'annual report 2020',
        );
        expect(createReadableCitationSourceLabel('https://www.example.com/')).toBe('example.com');
    });

    it('shows URL snippets for URL-backed file citations', () => {
        expect(
            getCitationLabel({
                id: '0:5',
                source: 'https://github.com/webgptorg/promptbook/blob/main/package.json',
            }),
        ).toBe('github.com/.../package.json');
    });

    it('shows a JSON fallback instead of raw JSON source text', () => {
        expect(
            getCitationLabel({
                id: '0:6',
                source: '[{"id":1239608413,"name":"source-file"}]',
            }),
        ).toBe('JSON file');
    });

    it('unwraps CDATA-wrapped source text into a readable label', () => {
        expect(
            getCitationLabel({
                id: '0:9',
                source: '<![CDATA[AI ta Krajta]]>',
            }),
        ).toBe('AI ta Krajta');
    });

    it('uses embedded JSON URLs as compact source snippets', () => {
        expect(
            getCitationLabel({
                id: '0:7',
                source: JSON.stringify({
                    name: 'package.json',
                    html_url: 'https://github.com/webgptorg/promptbook/blob/main/package.json',
                }),
            }),
        ).toBe('github.com/.../package.json');
    });

    it('shows image labels for binary-like image source text', () => {
        expect(
            getCitationLabel({
                id: '0:8',
                source: '\u00ff\u00d8\u00ff\u00e0 \u004a\u0046\u0049\u0046 binary image content',
            }),
        ).toBe('JPEG image');
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

        expect(resolveCitationPreviewUrl(explicitUrlCitation, participants)).toBe('https://manual.example/doc.pdf');
    });
});
