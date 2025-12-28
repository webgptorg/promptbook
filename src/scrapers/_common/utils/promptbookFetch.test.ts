import { describe, expect, it } from '@jest/globals';
import { promptbookFetch } from './promptbookFetch';

describe('how `promptbookFetch` works', () => {
    it('should fetch HTML content from a URL', async () => {
        await expect(promptbookFetch(`https://google.com/`).then((response) => response.text())).resolves.toMatch(
            /<!doctype html>/i,
        );

        await expect(promptbookFetch(`https://pavolhejny.com/`).then((response) => response.text())).resolves.toMatch(
            /<!doctype html>/i,
        );

        await expect(promptbookFetch(`https://s6.ptbk.io/`).then((response) => response.text())).resolves.toMatch(
            /<!doctype html>/i,
        );
    });
});
