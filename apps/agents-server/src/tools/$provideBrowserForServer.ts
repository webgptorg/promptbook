import { BrowserContext } from 'playwright';
import { BrowserConnectionProvider } from './BrowserConnectionProvider';

/**
 * Singleton instance of the browser connection provider.
 *
 * @private internal cache for `$provideBrowserForServer`
 */
let browserProvider: BrowserConnectionProvider | null = null;

/**
 * Provides a browser context for server-side operations, with caching to reuse instances.
 *
 * This function supports both local and remote browser connections based on metadata configuration.
 * Use REMOTE_BROWSER_URL metadata key to configure a remote Playwright server.
 *
 * @returns Browser context instance
 */
export async function $provideBrowserForServer(): Promise<BrowserContext> {
    if (browserProvider === null) {
        browserProvider = new BrowserConnectionProvider({ isVerbose: false });
    }

    return await browserProvider.getBrowserContext();
}

/**
 * Closes all open pages in the current browser context.
 *
 * This function is useful for cleanup between agent tasks to avoid memory leaks.
 * It does not close the browser instance itself, allowing it to be reused.
 */
export async function $closeBrowserPages(): Promise<void> {
    if (browserProvider !== null) {
        await browserProvider.closeAllPages();
    }
}

/**
 * Closes the browser context and disconnects from the browser.
 *
 * This should be called during server shutdown or when the browser is no longer needed.
 */
export async function $closeBrowser(): Promise<void> {
    if (browserProvider !== null) {
        await browserProvider.close();
        browserProvider = null;
    }
}

/**
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */