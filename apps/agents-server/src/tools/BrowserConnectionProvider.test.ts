import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Browser, BrowserContext } from 'playwright';

jest.mock('../../config', () => ({
    REMOTE_BROWSER_URL: 'ws://remote-browser.example/ws',
}));

jest.mock('playwright', () => ({
    chromium: {
        connect: jest.fn(),
        launchPersistentContext: jest.fn(),
    },
}));

import { chromium } from 'playwright';
import { BrowserConnectionProvider } from './BrowserConnectionProvider';

/**
 * Typed access to mocked Playwright Chromium methods used by the provider tests.
 */
const chromiumMock = chromium as unknown as {
    readonly connect: jest.MockedFunction<(wsEndpoint: string) => Promise<Browser>>;
    readonly launchPersistentContext: jest.MockedFunction<() => Promise<BrowserContext>>;
};

describe('BrowserConnectionProvider', () => {
    beforeEach(() => {
        chromiumMock.connect.mockReset();
        chromiumMock.launchPersistentContext.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses remote browser context when REMOTE_BROWSER_URL is configured', async () => {
        const browserContext = {} as BrowserContext;
        const newContextMock = jest.fn(async (): Promise<BrowserContext> => browserContext);
        const browser = { newContext: newContextMock } as unknown as Browser;

        chromiumMock.connect.mockResolvedValue(browser);

        const provider = new BrowserConnectionProvider();
        const result = await provider.getBrowserContext();

        expect(result).toBe(browserContext);
        expect(chromiumMock.connect).toHaveBeenCalledWith('ws://remote-browser.example/ws');
        expect(newContextMock).toHaveBeenCalledTimes(1);
        expect(chromiumMock.launchPersistentContext).not.toHaveBeenCalled();
    });

    it('does not fallback to local browser when remote connection fails', async () => {
        chromiumMock.connect.mockRejectedValue(new Error('Remote connection failed'));

        const provider = new BrowserConnectionProvider();

        await expect(provider.getBrowserContext()).rejects.toThrow('Remote connection failed');
        expect(chromiumMock.launchPersistentContext).not.toHaveBeenCalled();
    });
});
