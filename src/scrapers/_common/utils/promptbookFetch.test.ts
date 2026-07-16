import { describe, expect, it, jest } from '@jest/globals';
import { promptbookFetch } from './promptbookFetch';

// Note: This test depends on live network fetches which can transiently fail (ECONNRESET, DNS, rate limiting),
//       so retry it a few times before reporting a real failure
jest.retryTimes(3, { logErrorsBeforeRetry: true });

describe('how `promptbookFetch` works', () => {
    it('should fetch HTML content from a URL', async () => {
        await expect(promptbookFetch(`https://google.com/`).then((response) => response.text())).resolves.toMatch(
            /<!doctype html>/i,
        );

        await expect(promptbookFetch(`https://pavolhejny.com/`).then((response) => response.text())).resolves.toMatch(
            /<!doctype html>/i,
        );
    });
});
