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
        expect(titleToName(`https://promptbook.studio/webgpt/write-website-content.ptbk.md`)).toBe(
            `https://promptbook.studio/webgpt/write-website-content.ptbk.md`,
        );
    });

    it('should make relative file path', () => {
        expect(titleToName(`../webgpt/write-website-content.ptbk.md`)).toBe(`../webgpt/write-website-content.ptbk.md`);
    });
});
