import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { locateChrome } from '../../../../src/executables/browsers/locateChrome';
import { createServerChromiumLaunchOptions } from './createServerChromiumLaunchOptions';

jest.mock('../../../../src/executables/browsers/locateChrome', () => ({
    locateChrome: jest.fn(),
}));

/**
 * Typed access to the Chrome locator mock.
 */
const locateChromeMock = locateChrome as jest.MockedFunction<typeof locateChrome>;

describe('createServerChromiumLaunchOptions', () => {
    beforeEach(() => {
        locateChromeMock.mockReset();
    });

    it('uses the system Chrome executable when it is available', async () => {
        locateChromeMock.mockResolvedValue('/usr/bin/google-chrome');

        await expect(createServerChromiumLaunchOptions()).resolves.toMatchObject({
            headless: true,
            executablePath: '/usr/bin/google-chrome',
        });
    });

    it('omits executablePath when system Chrome is unavailable', async () => {
        locateChromeMock.mockResolvedValue(null);

        await expect(createServerChromiumLaunchOptions()).resolves.toEqual({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
    });

    it('omits executablePath when Chrome resolution fails', async () => {
        locateChromeMock.mockRejectedValue(new Error('Chrome lookup failed'));

        await expect(createServerChromiumLaunchOptions()).resolves.toEqual({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
    });
});
