import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import type { BrowserContext, Page } from 'playwright';
import { fetchUrlContent } from '../../../../src/commitments/USE_BROWSER/fetchUrlContent';
import { keepUnused } from '../../../../src/utils/organization/keepUnused';
import { $provideBrowserForServer } from './$provideBrowserForServer';
import { run_browser } from './run_browser';
import { RemoteBrowserUnavailableError } from './runBrowserErrors';

jest.mock('crypto', () => ({
    randomUUID: jest.fn(),
}));

jest.mock('fs/promises', () => ({
    mkdir: jest.fn(),
}));

jest.mock('./$provideBrowserForServer', () => ({
    $provideBrowserForServer: jest.fn(),
}));

jest.mock('../../../../src/commitments/USE_BROWSER/fetchUrlContent', () => ({
    fetchUrlContent: jest.fn(),
}));

const randomUUIDMock = randomUUID as jest.MockedFunction<typeof randomUUID>;
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const provideBrowserForServerMock = $provideBrowserForServer as jest.MockedFunction<typeof $provideBrowserForServer>;
const fetchUrlContentMock = fetchUrlContent as jest.MockedFunction<typeof fetchUrlContent>;

type AsyncVoidFn = () => Promise<void>;
type FillFn = (text: string) => Promise<void>;
type WheelFn = (x: number, y: number) => Promise<void>;

type LocatorMock = {
    first: jest.MockedFunction<
        () => {
            click: jest.MockedFunction<AsyncVoidFn>;
            fill: jest.MockedFunction<FillFn>;
            scrollIntoViewIfNeeded: jest.MockedFunction<AsyncVoidFn>;
        }
    >;
};

type PageMock = Pick<
    Page,
    'goto' | 'locator' | 'waitForTimeout' | 'screenshot' | 'title' | 'close' | 'url' | 'setDefaultNavigationTimeout' | 'setDefaultTimeout'
> & {
    mouse: {
        wheel: jest.MockedFunction<WheelFn>;
    };
};

type BrowserContextMock = Pick<BrowserContext, 'newPage'>;

/**
 * Creates a mocked Playwright page used by run_browser tests.
 */
function createPageMock(): {
    readonly page: PageMock;
    readonly clickMock: jest.MockedFunction<AsyncVoidFn>;
    readonly fillMock: jest.MockedFunction<FillFn>;
    readonly scrollIntoViewIfNeededMock: jest.MockedFunction<AsyncVoidFn>;
} {
    const clickMock = jest.fn(async (): Promise<void> => {}) as jest.MockedFunction<AsyncVoidFn>;
    const fillMock = jest.fn(async (_text: string): Promise<void> => {
        keepUnused(_text);
    }) as jest.MockedFunction<FillFn>;
    const scrollIntoViewIfNeededMock = jest.fn(async (): Promise<void> => {}) as jest.MockedFunction<AsyncVoidFn>;

    const locatorMock: LocatorMock = {
        first: jest.fn(() => ({
            click: clickMock,
            fill: fillMock,
            scrollIntoViewIfNeeded: scrollIntoViewIfNeededMock,
        })),
    };

    const page: PageMock = {
        goto: jest.fn(async () => null) as unknown as Page['goto'],
        locator: jest.fn(() => locatorMock) as unknown as Page['locator'],
        waitForTimeout: jest.fn(async (): Promise<void> => {}) as unknown as Page['waitForTimeout'],
        mouse: {
            wheel: jest.fn(async (_x: number, _y: number): Promise<void> => {
                keepUnused(_x);
                keepUnused(_y);
            }) as jest.MockedFunction<WheelFn>,
        },
        screenshot: jest.fn(async () => Buffer.from('')) as unknown as Page['screenshot'],
        title: jest.fn(async (): Promise<string> => 'Example Domain') as unknown as Page['title'],
        close: jest.fn(async (): Promise<void> => {}) as unknown as Page['close'],
        url: jest.fn(() => 'https://example.com/after') as unknown as Page['url'],
        setDefaultNavigationTimeout: jest.fn() as unknown as Page['setDefaultNavigationTimeout'],
        setDefaultTimeout: jest.fn() as unknown as Page['setDefaultTimeout'],
    };

    return {
        page,
        clickMock,
        fillMock,
        scrollIntoViewIfNeededMock,
    };
}

describe('run_browser tool', () => {
    beforeEach(() => {
        randomUUIDMock.mockReset();
        mkdirMock.mockReset();
        provideBrowserForServerMock.mockReset();
        fetchUrlContentMock.mockReset();

        randomUUIDMock.mockReturnValue('00000000-0000-4000-8000-000000000000');
        mkdirMock.mockResolvedValue(undefined);
        fetchUrlContentMock.mockResolvedValue('# Content from fallback scraper');
    });

    it('returns a clear error when url is missing', async () => {
        const result = await run_browser({ url: '' });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('Missing required `url` argument.');
        expect(result).toContain('RUN_BROWSER_VALIDATION_ERROR');
        expect(provideBrowserForServerMock).not.toHaveBeenCalled();
    });

    it('opens a browser page and returns final snapshot details', async () => {
        const { page } = createPageMock();
        const browserContext: BrowserContextMock = {
            newPage: jest.fn(async () => page as unknown as Page),
        };
        provideBrowserForServerMock.mockResolvedValue(browserContext as BrowserContext);

        const result = await run_browser({ url: 'https://example.com' });

        expect(result).toContain('# Browser run completed');
        expect(result).toContain('**Initial URL:** https://example.com');
        expect(result).toContain('**Executed actions:** 0');
        expect(result).toContain('"schema": "promptbook/run-browser@1"');
        expect(result).toContain('agents-server-run-browser-00000000-0000-4000-8000-000000000000-initial.png');
        expect(result).toContain('.playwright-cli/agents-server-run-browser-00000000-0000-4000-8000-000000000000.png');

        expect(browserContext.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledWith(
            'https://example.com',
            expect.objectContaining({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        );
        expect(page.screenshot).toHaveBeenCalledWith(
            expect.objectContaining({
                fullPage: true,
                path: expect.stringContaining('agents-server-run-browser-00000000-0000-4000-8000-000000000000.png'),
            }),
        );
        expect(page.close).toHaveBeenCalledTimes(1);
    });

    it('falls back to viewport screenshot when full-page snapshot fails', async () => {
        const { page } = createPageMock();
        const screenshotMock = page.screenshot as unknown as jest.MockedFunction<Page['screenshot']>;
        screenshotMock
            .mockImplementationOnce(async () => {
                throw new Error('Screenshot is too large');
            })
            .mockImplementation(async () => Buffer.from(''));

        const browserContext: BrowserContextMock = {
            newPage: jest.fn(async () => page as unknown as Page),
        };
        provideBrowserForServerMock.mockResolvedValue(browserContext as BrowserContext);

        const result = await run_browser({ url: 'https://example.com' });

        expect(result).toContain('# Browser run completed');
        expect(page.screenshot).toHaveBeenCalledWith(
            expect.objectContaining({
                fullPage: false,
                path: expect.stringContaining('agents-server-run-browser-00000000-0000-4000-8000-000000000000'),
            }),
        );
    });

    it('runs actions in sequence before generating final summary', async () => {
        const { page, clickMock, fillMock, scrollIntoViewIfNeededMock } = createPageMock();
        const browserContext: BrowserContextMock = {
            newPage: jest.fn(async () => page as unknown as Page),
        };
        provideBrowserForServerMock.mockResolvedValue(browserContext as BrowserContext);

        const result = await run_browser({
            url: 'https://example.com',
            actions: [
                { type: 'wait', value: 250 },
                { type: 'type', selector: '#query', value: 'Promptbook' },
                { type: 'click', selector: '#submit' },
                { type: 'scroll', selector: '#results', value: 500 },
                { type: 'navigate', value: 'https://example.com/next' },
            ],
        });

        expect(result).toContain('**Executed actions:** 5');
        expect(result).toContain('After action 1');
        expect(result).toContain('After action 5');
        expect(page.waitForTimeout).toHaveBeenCalledWith(250);
        expect(fillMock).toHaveBeenCalledWith('Promptbook', expect.objectContaining({ timeout: 15000 }));
        expect(clickMock).toHaveBeenCalledTimes(1);
        expect(scrollIntoViewIfNeededMock).toHaveBeenCalledTimes(1);
        expect(page.mouse.wheel).toHaveBeenCalledWith(0, 500);
        expect(page.goto).toHaveBeenNthCalledWith(
            2,
            'https://example.com/next',
            expect.objectContaining({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        );
        expect(page.close).toHaveBeenCalledTimes(1);
    });

    it('fails early when action arguments are invalid', async () => {
        const result = await run_browser({
            url: 'https://example.com',
            actions: [{ type: 'click' }],
        });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('RUN_BROWSER_VALIDATION_ERROR');
        expect(result).toContain('requires non-empty');
        expect(provideBrowserForServerMock).not.toHaveBeenCalled();
    });

    it('falls back to scrape content when remote browser connection is unavailable', async () => {
        provideBrowserForServerMock.mockRejectedValue(
            new RemoteBrowserUnavailableError({
                message: 'Remote browser is unavailable.',
                debug: {
                    endpoint: { protocol: 'ws:', host: '127.0.0.1', port: 3000 },
                    attempts: 3,
                    connectTimeoutMs: 7000,
                    durationMs: 1200,
                    networkErrorCode: 'ECONNREFUSED',
                    originalMessage: 'connect ECONNREFUSED 127.0.0.1:3000',
                },
            }),
        );
        fetchUrlContentMock.mockResolvedValue('# Content from fallback scraper');

        const result = await run_browser({
            url: 'https://example.com',
            actions: [{ type: 'wait', value: 200 }],
        });

        expect(result).toContain('# Browser run completed with fallback');
        expect(result).toContain('"modeUsed": "fallback"');
        expect(result).toContain('REMOTE_BROWSER_UNAVAILABLE');
        expect(result).toContain('# Content from fallback scraper');
        expect(fetchUrlContentMock).toHaveBeenCalledWith('https://example.com');
    });

    it('classifies initial navigation failures when browser connects successfully', async () => {
        const { page } = createPageMock();
        page.goto = jest.fn(async () => {
            throw new Error('net::ERR_NAME_NOT_RESOLVED');
        }) as unknown as Page['goto'];

        const browserContext: BrowserContextMock = {
            newPage: jest.fn(async () => page as unknown as Page),
        };
        provideBrowserForServerMock.mockResolvedValue(browserContext as BrowserContext);

        const result = await run_browser({ url: 'https://example.com' });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('RUN_BROWSER_NAVIGATION_FAILED');
        expect(fetchUrlContentMock).not.toHaveBeenCalled();
    });
});
