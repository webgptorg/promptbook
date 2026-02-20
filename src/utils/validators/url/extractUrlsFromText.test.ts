import { describe, expect, it } from '@jest/globals';
import { extractUrlsFromText } from './extractUrlsFromText';

describe('extractUrlsFromText', () => {
    it('extracts URLs from plain text', () => {
        expect(extractUrlsFromText('Use https://example.com/docs for details.')).toEqual(['https://example.com/docs']);
    });

    it('extracts multiple URLs in order', () => {
        expect(
            extractUrlsFromText(
                'Read https://example.com/a and https://example.org/b?x=1#frag before starting.',
            ),
        ).toEqual(['https://example.com/a', 'https://example.org/b?x=1#frag']);
    });

    it('strips trailing punctuation and wrappers', () => {
        expect(extractUrlsFromText('Please review (https://example.com/file.pdf).')).toEqual([
            'https://example.com/file.pdf',
        ]);
    });

    it('keeps balanced parenthesis that are part of the URL', () => {
        expect(extractUrlsFromText('https://en.wikipedia.org/wiki/Function_(mathematics).')).toEqual([
            'https://en.wikipedia.org/wiki/Function_(mathematics)',
        ]);
    });

    it('extracts URLs from markdown links', () => {
        expect(extractUrlsFromText('See [document](https://example.com/doc.pdf) for context.')).toEqual([
            'https://example.com/doc.pdf',
        ]);
    });

    it('deduplicates repeated URLs', () => {
        expect(extractUrlsFromText('https://example.com https://example.com')).toEqual(['https://example.com']);
    });

    it('ignores malformed URL candidates', () => {
        expect(extractUrlsFromText('Broken urls: https:// http://')).toEqual([]);
    });
});
