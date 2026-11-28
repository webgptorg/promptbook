import { locatePandoc } from './locatePandoc';
import { describe, expect, it } from '@jest/globals';

describe('locating the Pandoc - The universal markup converter', () => {
    it('should locate Pandoc', async () => {
        await expect(locatePandoc()).resolves.toMatch(/pandoc/i);
        expect.assertions(1);
    });
});
