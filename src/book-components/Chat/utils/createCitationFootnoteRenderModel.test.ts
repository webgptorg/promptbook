import { describe, expect, it } from '@jest/globals';
import { createCitationFootnoteRenderModel } from './createCitationFootnoteRenderModel';

describe('createCitationFootnoteRenderModel', () => {
    it('parses bracketed citation ids and deduplicates repeated documents into one footnote', () => {
        const renderModel = createCitationFootnoteRenderModel({
            content: 'Alpha [0:0] and beta [8:13].',
            citations: [
                { id: '0:0', source: 'document123.doc' },
                { id: '8:13', source: 'document123.doc' },
            ],
        });

        expect(renderModel.content).toBe(
            'Alpha <sup data-citation-footnote="1">1</sup> and beta <sup data-citation-footnote="1">1</sup>.',
        );
        expect(renderModel.footnotes).toEqual([
            {
                number: 1,
                citation: {
                    id: '0:0',
                    source: 'document123.doc',
                    url: undefined,
                    excerpt: undefined,
                },
            },
        ]);
    });

    it('assigns citation numbers by first appearance in the message body', () => {
        const renderModel = createCitationFootnoteRenderModel({
            content: 'First [8:13], then [0:0], and finally [8:13] again.',
            citations: [
                { id: '0:0', source: 'second-document.pdf' },
                { id: '8:13', source: 'first-document.pdf' },
            ],
        });

        expect(renderModel.content).toBe(
            'First <sup data-citation-footnote="1">1</sup>, then <sup data-citation-footnote="2">2</sup>, and finally <sup data-citation-footnote="1">1</sup> again.',
        );
        expect(renderModel.footnotes).toEqual([
            {
                number: 1,
                citation: {
                    id: '8:13',
                    source: 'first-document.pdf',
                    url: undefined,
                    excerpt: undefined,
                },
            },
            {
                number: 2,
                citation: {
                    id: '0:0',
                    source: 'second-document.pdf',
                    url: undefined,
                    excerpt: undefined,
                },
            },
        ]);
    });

    it('uses inline full citation markers when structured metadata is absent', () => {
        const renderModel = createCitationFootnoteRenderModel({
            content:
                'Answer with source \u30107:15\u2020document123.doc\u3011 and follow-up \u30107:99\u2020document123.doc\u3011.',
        });

        expect(renderModel.content).toBe(
            'Answer with source <sup data-citation-footnote="1">1</sup> and follow-up <sup data-citation-footnote="1">1</sup>.',
        );
        expect(renderModel.footnotes).toEqual([
            {
                number: 1,
                citation: {
                    id: '7:15',
                    source: 'document123.doc',
                    url: undefined,
                    excerpt: undefined,
                },
            },
        ]);
    });
});
