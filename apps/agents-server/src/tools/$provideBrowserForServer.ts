import { locateChrome } from 'locate-app';
import { join } from 'path';
import { BrowserContext, chromium } from 'playwright';

/**
 * Cache of browser instance
 *
 * @private internal cache for `$provideBrowserForServer`
 */
let browserInstance: BrowserContext | null = null;

/**
 * Provides a browser context for server-side operations, with caching to reuse instances.
 */
export async function $provideBrowserForServer(): Promise<BrowserContext> {
    if (browserInstance !== null && browserInstance.browser() && browserInstance.browser()!.isConnected()) {
        return browserInstance;
    }

    console.log('Launching new browser instance...');
    browserInstance = await chromium.launchPersistentContext(
        join(process.cwd(), '.promptbook', 'puppeteer', 'user-data'),
        {
            executablePath: await locateChrome(),
            headless: false,
            // defaultViewport: null,
            // downloadsPath
        },
    );

    return browserInstance;
}
