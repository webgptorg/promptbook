import { describe, expect, it } from '@jest/globals';
import { titleToName } from './titleToName';

describe('how titleToName works', () => {
    it('should make name from title', () => {
        expect(titleToName(`hello`)).toBe(`hello`);
        expect(titleToName(`hello 🤘`)).toBe(`hello`);
        expect(titleToName(`hello world`)).toBe(`hello-world`);
        expect(titleToName(`Hello, how are ýóů?`)).toBe(`hello-how-are-you`);
        expect(
            titleToName(`  Hello, how
                           are ýóů?   `),
        ).toBe(`hello-how-are-you`);
    });

    it('should make name url', () => {
        expect(titleToName(`https://promptbook.studio/webgpt/write-website-content.book`)).toBe(
            `promptbook-studio-webgpt-write-website-content-book`,
        );

        expect(titleToName(`https://promptbook.studio/webgpt/write-website-content.html`)).toBe(
            `promptbook-studio-webgpt-write-website-content`,
        );
    });

    it('should make relative file path', () => {
        expect(titleToName(`../webgpt/write-website-content.book`)).toBe(`write-website-content-book`);
        expect(titleToName(`../webgpt/write-website-content.book.html`)).toBe(`write-website-content-book-html`);
        expect(titleToName(`./webgpt/write-website-content.book`)).toBe(`write-website-content-book`);
        expect(titleToName(`./webgpt/write-website-content.book.html`)).toBe(`write-website-content-book-html`);
    });

    it('should make absolute file path', () => {
        expect(titleToName(`C://Users/pavol/projects/webgpt/write-website-content.book`)).toBe(
            `write-website-content-book`,
        );
        expect(titleToName(`/home/pavol/projects/webgpt/write-website-content.book`)).toBe(
            `write-website-content-book`,
        );
    });
});
