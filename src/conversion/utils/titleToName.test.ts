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
});
