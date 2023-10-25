import { describe, expect, it } from '@jest/globals';
import { removeMarkdownFormatting } from './removeMarkdownFormatting';

describe('removeMarkdownFormatting', () => {
    it('should remove bold formatting from a string', () => {
        const str = 'This is **bold** text.';
        const expected = 'This is bold text.';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });

    it('should remove multiple instances of bold formatting from a string', () => {
        const str = 'This is **bold** and **also bold** text.';
        const expected = 'This is bold and also bold text.';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });

    it('should remove italic formatting from a string', () => {
        const str = 'This is *italic* text.';
        const expected = 'This is italic text.';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });

    it('should remove code formatting from a string', () => {
        const str = 'This is name of the function `spaceTrim`.';
        const expected = 'This is name of the function spaceTrim.';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });

    it('should remove multiple instances of italic formatting from a string', () => {
        const str = 'This is *italic* and *also italic* text.';
        const expected = 'This is italic and also italic text.';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });

    it('should return the original string if it contains no Markdown tags', () => {
        const str = 'This is a plain string.';
        expect(removeMarkdownFormatting(str)).toEqual(str);
    });

    it('should preserve just one mark text', () => {
        const str1 = 'I am * You are';
        expect(removeMarkdownFormatting(str1)).toEqual(str1);

        const str2 = 'I am * You are * He is * She is * It is * We are * They are *';
        expect(removeMarkdownFormatting(str2)).toEqual(str2);

        const str3 = 'I`m here';
        expect(removeMarkdownFormatting(str3)).toEqual(str3);

        const str4 = "I'm here You`re here";
        expect(removeMarkdownFormatting(str4)).toEqual(str4);
    });

    /*
    TODO:
    it('should convert headings to texts', () => {
        const str = spaceTrim(`
            # Heading 1

            ## Heading 2

            Text

        `);
        const expected = 'Heading 1\n\nHeading 2\n\nText';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });
    */

    /*
    TODO:
    it('should convert blockquotes to texts', () => {
        const str = spaceTrim(`
            # Heading 1

            > Quote 1

            Text

        `);
        const expected = 'Heading 1\n\nQuote 1\n\nText';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });
    */

    /*
    TODO:
    it('should remove horizontal line', () => {
        const str = spaceTrim(`
            Text

            ---

            Text

        `);
        const expected = 'Text\n\nText';
        expect(removeMarkdownFormatting(str)).toEqual(expected);
    });
    */
});
