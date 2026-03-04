import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { BrowserContext, Page } from 'playwright';
import { $provideBrowserForServer } from './$provideBrowserForServer';
import { run_browser } from './run_browser';

jest.mock('crypto', () => ({
    randomUUID: jest.fn(),
}));

jest.mock('fs/promises', () => ({
    mkdir: jest.fn(),
}));

jest.mock('./$provideBrowserForServer', () => ({
    $provideBrowserForServer: jest.fn(),
}));

const randomUUIDMock = randomUUID as jest.MockedFunction<typeof randomUUID>;
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const provideBrowserForServerMock = $provideBrowserForServer as jest.MockedFunction<typeof $provideBrowserForServer>;

type AsyncVoidFn = () => Promise<void>;
type FillFn = (text: string) => Promise<void>;
type WheelFn = (x: number, y: number) => Promise<void>;

type LocatorMock = {
    first: jest.MockedFunction<() => {
        click: jest.MockedFunction<AsyncVoidFn>;
        fill: jest.MockedFunction<FillFn>;
        scrollIntoViewIfNeeded: jest.MockedFunction<AsyncVoidFn>;
    }>;
};

type PageMock = Pick<Page, 'goto' | 'locator' | 'waitForTimeout' | 'screenshot' | 'title' | 'close' | 'url'> & {
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
    const fillMock = jest.fn(async (_text: string): Promise<void> => {}) as jest.MockedFunction<FillFn>;
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
            wheel: jest.fn(async (_x: number, _y: number): Promise<void> => {}) as jest.MockedFunction<WheelFn>,
        },
        screenshot: jest.fn(async () => Buffer.from('')) as unknown as Page['screenshot'],
        title: jest.fn(async (): Promise<string> => 'Example Domain') as unknown as Page['title'],
        close: jest.fn(async (): Promise<void> => {}) as unknown as Page['close'],
        url: jest.fn(() => 'https://example.com/after') as unknown as Page['url'],
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

        randomUUIDMock.mockReturnValue('00000000-0000-4000-8000-000000000000');
        mkdirMock.mockResolvedValue(undefined);
    });

    it('returns a clear error when url is missing', async () => {
        const result = await run_browser({ url: '' });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('Missing required URL');
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
        expect(result).toContain('.playwright-cli/agents-server-run-browser-00000000-0000-4000-8000-000000000000.png');

        expect(browserContext.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'domcontentloaded' });
        expect(page.screenshot).toHaveBeenCalledWith(
            expect.objectContaining({
                fullPage: true,
                path: expect.stringContaining('agents-server-run-browser-00000000-0000-4000-8000-000000000000.png'),
            }),
        );
        expect(page.close).toHaveBeenCalledTimes(1);
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
        expect(page.waitForTimeout).toHaveBeenCalledWith(250);
        expect(fillMock).toHaveBeenCalledWith('Promptbook');
        expect(clickMock).toHaveBeenCalledTimes(1);
        expect(scrollIntoViewIfNeededMock).toHaveBeenCalledTimes(1);
        expect(page.mouse.wheel).toHaveBeenCalledWith(0, 500);
        expect(page.goto).toHaveBeenNthCalledWith(2, 'https://example.com/next', { waitUntil: 'domcontentloaded' });
        expect(page.close).toHaveBeenCalledTimes(1);
    });

    it('fails early when action arguments are invalid', async () => {
        const result = await run_browser({
            url: 'https://example.com',
            actions: [{ type: 'click' }],
        });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('"click" requires non-empty "selector"');
        expect(provideBrowserForServerMock).not.toHaveBeenCalled();
    });
});
