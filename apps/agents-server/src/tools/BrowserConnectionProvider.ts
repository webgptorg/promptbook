import { BrowserContext, chromium } from 'playwright';
import { join } from 'path';
import { locateChrome } from 'locate-app';
import { getMetadata } from '../database/getMetadata';

/**
 * Configuration for browser connection mode.
 *
 * @private internal type for `BrowserConnectionProvider`
 */
type BrowserConnectionMode =
    | { readonly type: 'local' }
    | { readonly type: 'remote'; readonly wsEndpoint: string };

/**
 * Metadata key for remote browser WebSocket endpoint.
 */
const REMOTE_BROWSER_URL_METADATA_KEY = 'REMOTE_BROWSER_URL';

/**
 * Provides browser context instances with support for both local and remote browser connections.
 *
 * This provider manages browser lifecycle and supports:
 * - Local mode: Launches a persistent Chromium context on the same machine
 * - Remote mode: Connects to a remote Playwright browser via WebSocket
 *
 * The remote mode is useful for environments like Vercel where running a full browser
 * is not possible due to resource constraints.
 *
 * @private internal utility for Agents Server browser tools
 */
export class BrowserConnectionProvider {
    private browserContext: BrowserContext | null = null;
    private connectionMode: BrowserConnectionMode | null = null;
    private readonly isVerbose: boolean;

    /**
     * Creates a new BrowserConnectionProvider.
     *
     * @param options - Provider options
     * @param options.isVerbose - Enable verbose logging
     */
    public constructor(options: { readonly isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets a browser context, creating a new one if needed.
     *
     * This method automatically determines whether to use local or remote browser
     * based on the REMOTE_BROWSER_URL metadata configuration.
     *
     * @returns Browser context instance
     */
    public async getBrowserContext(): Promise<BrowserContext> {
        // Check if we have a cached connection that's still valid
        if (this.browserContext !== null && this.isBrowserContextAlive(this.browserContext)) {
            return this.browserContext;
        }

        // Determine connection mode from configuration
        const mode = await this.resolveConnectionMode();
        this.connectionMode = mode;

        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Creating new browser context', {
                mode: mode.type,
                wsEndpoint: mode.type === 'remote' ? mode.wsEndpoint : undefined,
            });
        }

        // Create new browser context based on mode
        if (mode.type === 'local') {
            this.browserContext = await this.createLocalBrowserContext();
        } else {
            this.browserContext = await this.createRemoteBrowserContext(mode.wsEndpoint);
        }

        return this.browserContext;
    }

    /**
     * Closes all pages in the current browser context.
     *
     * This method is useful for cleanup between agent tasks without closing
     * the entire browser instance.
     */
    public async closeAllPages(): Promise<void> {
        if (!this.browserContext) {
            return;
        }

        try {
            const pages = this.browserContext.pages();

            if (this.isVerbose) {
                console.info('[BrowserConnectionProvider] Closing all pages', {
                    pageCount: pages.length,
                });
            }

            await Promise.all(pages.map((page) => page.close().catch((error) => {
                console.error('[BrowserConnectionProvider] Failed to close page', { error });
            })));
        } catch (error) {
            console.error('[BrowserConnectionProvider] Error closing pages', { error });
        }
    }

    /**
     * Closes the browser context and disconnects from the browser.
     *
     * This should be called when the browser is no longer needed to free up resources.
     * For local mode, this closes the browser process. For remote mode, it disconnects
     * from the remote browser but doesn't shut down the remote server.
     */
    public async close(): Promise<void> {
        if (!this.browserContext) {
            return;
        }

        try {
            if (this.isVerbose) {
                console.info('[BrowserConnectionProvider] Closing browser context', {
                    mode: this.connectionMode?.type,
                });
            }

            await this.browserContext.close();
            this.browserContext = null;
            this.connectionMode = null;
        } catch (error) {
            console.error('[BrowserConnectionProvider] Error closing browser context', { error });
            // Reset state even if close fails
            this.browserContext = null;
            this.connectionMode = null;
        }
    }

    /**
     * Checks if a browser context is still alive and connected.
     *
     * @param context - Browser context to check
     * @returns True if the context is connected and usable
     */
    private isBrowserContextAlive(context: BrowserContext): boolean {
        try {
            const browser = context.browser();
            return browser !== null && browser.isConnected();
        } catch {
            return false;
        }
    }

    /**
     * Determines whether to use local or remote browser based on configuration.
     *
     * @returns Connection mode configuration
     */
    private async resolveConnectionMode(): Promise<BrowserConnectionMode> {
        const remoteBrowserUrl = await getMetadata(REMOTE_BROWSER_URL_METADATA_KEY);

        if (remoteBrowserUrl && remoteBrowserUrl.trim().length > 0) {
            return {
                type: 'remote',
                wsEndpoint: remoteBrowserUrl.trim(),
            };
        }

        return { type: 'local' };
    }

    /**
     * Creates a local browser context using persistent Chromium.
     *
     * @returns Local browser context
     */
    private async createLocalBrowserContext(): Promise<BrowserContext> {
        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Launching local browser context');
        }

        return await chromium.launchPersistentContext(
            join(process.cwd(), '.promptbook', 'puppeteer', 'user-data'),
            {
                executablePath: await locateChrome(),
                headless: false,
            },
        );
    }

    /**
     * Creates a remote browser context by connecting to a Playwright server.
     *
     * @param wsEndpoint - WebSocket endpoint of the remote Playwright server
     * @returns Remote browser context
     */
    private async createRemoteBrowserContext(wsEndpoint: string): Promise<BrowserContext> {
        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Connecting to remote browser', {
                wsEndpoint,
            });
        }

        try {
            const browser = await chromium.connect(wsEndpoint);

            // For remote connections, we need to create a new context
            // Note: Remote browsers don't support persistent contexts
            const context = await browser.newContext();

            if (this.isVerbose) {
                console.info('[BrowserConnectionProvider] Successfully connected to remote browser');
            }

            return context;
        } catch (error) {
            console.error('[BrowserConnectionProvider] Failed to connect to remote browser', {
                wsEndpoint,
                error,
            });

            // Fall back to local browser on connection failure
            console.warn('[BrowserConnectionProvider] Falling back to local browser');
            return await this.createLocalBrowserContext();
        }
    }
}
