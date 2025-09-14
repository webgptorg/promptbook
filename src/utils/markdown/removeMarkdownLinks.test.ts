import { describe, expect, it } from '@jest/globals';
import { removeMarkdownLinks } from './removeMarkdownLinks';

describe('removeMarkdownLinks', () => {
    it('should remove Markdown link tags from a string', () => {
        const str = 'This is a [link](http://example.com).';
        const expected = 'This is a link.';
        expect(removeMarkdownLinks(str)).toEqual(expected);
    });

    it('should remove multiple Markdown link tags from a string', () => {
        const str = 'This is a [link](http://example.com) and [another link](http://example.com).';
        const expected = 'This is a link and another link.';
        expect(removeMarkdownLinks(str)).toEqual(expected);
    });

    it('should return the original string if it contains no Markdown tags', () => {
        const str = 'This is a plain string.';
        expect(removeMarkdownLinks(str)).toEqual(str);
    });
});

/**
 * @see https://chat.openai.com/chat/bb7c3a5b-fe9c-4ccc-9057-f47e0fd66489
 */
