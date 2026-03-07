import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Browser, BrowserContext } from 'playwright';
import { REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE } from './runBrowserErrors';

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
    readonly connect: jest.MockedFunction<
        (wsEndpoint: string, options?: { timeout?: number }) => Promise<Browser>
    >;
    readonly launchPersistentContext: jest.MockedFunction<() => Promise<BrowserContext>>;
};

describe('BrowserConnectionProvider', () => {
    beforeEach(() => {
        chromiumMock.connect.mockReset();
        chromiumMock.launchPersistentContext.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses remote browser context when REMOTE_BROWSER_URL is configured', async () => {
        const browserContext = {} as BrowserContext;
        const newContextMock = jest.fn(async (): Promise<BrowserContext> => browserContext);
        const browser = { newContext: newContextMock } as unknown as Browser;

        chromiumMock.connect.mockResolvedValue(browser);

        const provider = new BrowserConnectionProvider({
            remoteConnectTimeoutMs: 7777,
        });
        const result = await provider.getBrowserContext();

        expect(result).toBe(browserContext);
        expect(chromiumMock.connect).toHaveBeenCalledWith('ws://remote-browser.example/ws', { timeout: 7777 });
        expect(newContextMock).toHaveBeenCalledTimes(1);
        expect(chromiumMock.launchPersistentContext).not.toHaveBeenCalled();
    });

    it('retries remote connect and throws REMOTE_BROWSER_UNAVAILABLE after retries are exhausted', async () => {
        chromiumMock.connect.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3000'));
        const sleepMock = jest.fn(async (): Promise<void> => undefined);

        const provider = new BrowserConnectionProvider({
            remoteConnectRetries: 2,
            remoteConnectBackoffInitialMs: 1,
            remoteConnectBackoffMaxMs: 1,
            remoteConnectJitterRatio: 0,
            sleep: sleepMock,
        });

        await expect(provider.getBrowserContext()).rejects.toMatchObject({
            code: REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE,
        });
        expect(chromiumMock.connect).toHaveBeenCalledTimes(3);
        expect(sleepMock).toHaveBeenCalledTimes(2);
        expect(chromiumMock.launchPersistentContext).not.toHaveBeenCalled();
    });
});
