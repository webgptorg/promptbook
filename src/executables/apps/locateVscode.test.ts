import { locateVscode } from './locateVscode';

describe('locating the Visual Studio Code IDE', () => {
    it('should locate Visual Studio Code IDE', async () => {
        await expect(locateVscode()).resolves.toMatch(/code/i);
        expect.assertions(1);
    });
});
