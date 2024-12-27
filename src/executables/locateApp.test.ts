import { locateApp } from './locateApp';

describe('locating the app', () => {
    it('should locate Chrome', async () => {
        await expect(
            locateApp({
                appName: 'Chrome',
                linuxWhich: 'google-chrome',
                windowsSuffix: '\\Google\\Chrome\\Application\\chrome.exe',
                macOsName: 'Google Chrome',
            }),
        ).resolves.toMatch(/chrome/i);
        expect.assertions(1);
    });
});
