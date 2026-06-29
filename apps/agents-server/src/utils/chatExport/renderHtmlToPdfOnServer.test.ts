import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import {
    createServerChromiumLaunchOptions,
    type ServerChromiumLaunchOptions,
} from '@/src/tools/createServerChromiumLaunchOptions';
import { renderHtmlToPdfOnServer } from './renderHtmlToPdfOnServer';

jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn(),
    },
}));

jest.mock('@/src/tools/createServerChromiumLaunchOptions', () => ({
    createServerChromiumLaunchOptions: jest.fn(),
}));

/**
 * Minimal mocked Playwright page used by PDF renderer tests.
 */
type PageMock = Pick<Page, 'route' | 'setViewportSize' | 'emulateMedia' | 'setContent' | 'evaluate' | 'pdf' | 'close'>;

/**
 * Minimal mocked Playwright browser used by PDF renderer tests.
 */
type BrowserMock = Pick<Browser, 'newPage' | 'close'>;

/**
 * Minimal route handler shape used to exercise the renderer request guard.
 */
type RouteHandlerMock = (
    route: {
        request: () => { url: () => string };
        abort: (errorCode?: string) => Promise<void>;
        continue: () => Promise<void>;
    },
    request?: unknown,
) => unknown;

/**
 * Typed access to mocked Playwright Chromium.
 */
const chromiumMock = chromium as unknown as {
    readonly launch: jest.MockedFunction<(options: ServerChromiumLaunchOptions) => Promise<Browser>>;
};

/**
 * Typed access to the launch option helper mock.
 */
const createServerChromiumLaunchOptionsMock = createServerChromiumLaunchOptions as jest.MockedFunction<
    typeof createServerChromiumLaunchOptions
>;

describe('renderHtmlToPdfOnServer', () => {
    beforeEach(() => {
        chromiumMock.launch.mockReset();
        createServerChromiumLaunchOptionsMock.mockReset();
    });

    it('renders standalone HTML into PDF bytes with headless Chromium', async () => {
        const launchOptions: ServerChromiumLaunchOptions = {
            headless: true,
            args: ['--no-sandbox'],
        };
        const pdfBuffer = Buffer.from('%PDF-rendered');
        const routeMock = jest.fn(async (): Promise<void> => undefined);
        const setViewportSizeMock = jest.fn(async (): Promise<void> => undefined);
        const emulateMediaMock = jest.fn(async (): Promise<void> => undefined);
        const setContentMock = jest.fn(async (): Promise<void> => undefined);
        const evaluateMock = jest.fn(async (): Promise<void> => undefined);
        const pdfMock = jest.fn(async (): Promise<Buffer> => pdfBuffer);
        const closePageMock = jest.fn(async (): Promise<void> => undefined);
        const page: PageMock = {
            route: routeMock as unknown as Page['route'],
            setViewportSize: setViewportSizeMock as unknown as Page['setViewportSize'],
            emulateMedia: emulateMediaMock as unknown as Page['emulateMedia'],
            setContent: setContentMock as unknown as Page['setContent'],
            evaluate: evaluateMock as unknown as Page['evaluate'],
            pdf: pdfMock as unknown as Page['pdf'],
            close: closePageMock as unknown as Page['close'],
        };
        const newPageMock = jest.fn(async (): Promise<Page> => page as Page);
        const closeBrowserMock = jest.fn(async (): Promise<void> => undefined);
        const browser: BrowserMock = {
            newPage: newPageMock as unknown as Browser['newPage'],
            close: closeBrowserMock as unknown as Browser['close'],
        };

        createServerChromiumLaunchOptionsMock.mockResolvedValue(launchOptions);
        chromiumMock.launch.mockResolvedValue(browser as Browser);

        await expect(renderHtmlToPdfOnServer('<!doctype html><h1>Chat export</h1>')).resolves.toBe(pdfBuffer);

        expect(createServerChromiumLaunchOptionsMock).toHaveBeenCalledTimes(1);
        expect(chromiumMock.launch).toHaveBeenCalledWith(launchOptions);
        expect(newPageMock).toHaveBeenCalledTimes(1);
        expect(routeMock).toHaveBeenCalledWith('**/*', expect.any(Function));
        expect(setViewportSizeMock).toHaveBeenCalledWith({ width: 1280, height: 1600 });
        expect(emulateMediaMock).toHaveBeenCalledWith({ media: 'print' });
        expect(setContentMock).toHaveBeenCalledWith('<!doctype html><h1>Chat export</h1>', { waitUntil: 'load' });
        expect(evaluateMock).toHaveBeenCalledTimes(1);
        expect(pdfMock).toHaveBeenCalledWith({
            format: 'Letter',
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
            },
            printBackground: true,
            preferCSSPageSize: true,
        });
        expect(closePageMock).toHaveBeenCalledTimes(1);
        expect(closeBrowserMock).toHaveBeenCalledTimes(1);
    });

    it('aborts external network requests during PDF rendering', async () => {
        const routeHandlers: Array<RouteHandlerMock> = [];
        const page: PageMock = {
            route: jest.fn(async (_selector, handler): Promise<void> => {
                routeHandlers.push(handler as RouteHandlerMock);
            }) as unknown as Page['route'],
            setViewportSize: jest.fn(async (): Promise<void> => undefined) as unknown as Page['setViewportSize'],
            emulateMedia: jest.fn(async (): Promise<void> => undefined) as unknown as Page['emulateMedia'],
            setContent: jest.fn(async (): Promise<void> => undefined) as unknown as Page['setContent'],
            evaluate: jest.fn(async (): Promise<void> => undefined) as unknown as Page['evaluate'],
            pdf: jest.fn(async (): Promise<Buffer> => Buffer.from('%PDF-rendered')) as unknown as Page['pdf'],
            close: jest.fn(async (): Promise<void> => undefined) as unknown as Page['close'],
        };
        const browser: BrowserMock = {
            newPage: jest.fn(async (): Promise<Page> => page as Page) as unknown as Browser['newPage'],
            close: jest.fn(async (): Promise<void> => undefined) as unknown as Browser['close'],
        };
        const abortMock = jest.fn(async (): Promise<void> => undefined);
        const continueMock = jest.fn(async (): Promise<void> => undefined);

        createServerChromiumLaunchOptionsMock.mockResolvedValue({ headless: true, args: [] });
        chromiumMock.launch.mockResolvedValue(browser as Browser);

        await renderHtmlToPdfOnServer('<img src="https://example.com/avatar.png" />');

        expect(routeHandlers).toHaveLength(1);
        await routeHandlers[0]!({
            request: () => ({
                url: () => 'https://example.com/avatar.png',
            }),
            abort: abortMock,
            continue: continueMock,
        });

        expect(abortMock).toHaveBeenCalledWith('blockedbyclient');
        expect(continueMock).not.toHaveBeenCalled();
    });
});
