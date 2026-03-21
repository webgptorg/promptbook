import { locateChrome } from './locateChrome';
import { describe, expect, it } from '@jest/globals';

describe('locating the Chrome browser', () => {
    it('should locate Chrome browser', async () => {
        await expect(locateChrome()).resolves.toMatch(/chrome/i);
        expect.assertions(1);
    });
});
