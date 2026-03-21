import { locateFirefox } from './locateFirefox';
import { describe, expect, it } from '@jest/globals';

describe('locating the Firefox browser', () => {
    it('should locate Firefox browser', async () => {
        await expect(locateFirefox()).resolves.toMatch(/firefox/i);
        expect.assertions(1);
    });
});
