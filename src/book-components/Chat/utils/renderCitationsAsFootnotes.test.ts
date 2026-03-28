import { describe, expect, it } from '@jest/globals';
import { renderCitationsAsFootnotes } from './renderCitationsAsFootnotes';

describe('renderCitationsAsFootnotes', () => {
    it('parses `[0:0]` and `[8:13]` tokens and deduplicates them by document source', () => {
        const result = renderCitationsAsFootnotes({
            content: 'Alpha [0:0], beta [8:13], gamma [0:0].',
            citations: [
                { id: '0:0', source: 'document123.doc' },
                { id: '8:13', source: 'document123.doc' },
            ],
        });

        expect(result.content).toBe('Alpha [1], beta [1], gamma [1].');
        expect(result.footnotes).toEqual([
            {
                number: 1,
                citation: { id: '0:0', source: 'document123.doc' },
            },
        ]);
    });

    it('keeps numbering stable by first appearance order of cited documents', () => {
        const result = renderCitationsAsFootnotes({
            content: 'First [8:13], second [0:0], third [2:1], fourth [8:13].',
            citations: [
                { id: '8:13', source: 'research-a.pdf' },
                { id: '0:0', source: 'policy-b.docx' },
                { id: '2:1', source: 'appendix-c.txt' },
            ],
        });

        expect(result.content).toBe('First [1], second [2], third [3], fourth [1].');
        expect(result.footnotes.map((footnote) => footnote.citation.source)).toEqual([
            'research-a.pdf',
            'policy-b.docx',
            'appendix-c.txt',
        ]);
    });

    it('renders mixed marker notations into one numbered body with one footnote per document', () => {
        const result = renderCitationsAsFootnotes({
            content: 'Fact one 【0:0†document123.doc】 and fact two [8:13]. Also other 【9:9†budget.xlsx】.',
            citations: [{ id: '8:13', source: 'document123.doc' }],
        });

        expect(result.content).toBe('Fact one [1] and fact two [1]. Also other [2].');
        expect(result.footnotes).toEqual([
            {
                number: 1,
                citation: { id: '0:0', source: 'document123.doc', url: undefined, excerpt: undefined },
            },
            {
                number: 2,
                citation: { id: '9:9', source: 'budget.xlsx', url: undefined, excerpt: undefined },
            },
        ]);
    });
});
