import { locateDefaultSystemBrowser } from './locateDefaultSystemBrowser';
import { describe, expect, it } from '@jest/globals';

describe('locating default system browser', () => {
    it('should locate default system browser', async () => {
        await expect(locateDefaultSystemBrowser()).resolves.toBeDefined();
        expect.assertions(1);
    });

    it('should locate same default system browser when asking twice', async () => {
        expect(await locateDefaultSystemBrowser()).toEqual(
            await locateDefaultSystemBrowser(),
        );
        expect.assertions(1);
    });
});
