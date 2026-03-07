import { mkdir } from 'fs/promises';
import { locateChrome } from 'locate-app';
import { tmpdir } from 'os';
import { join } from 'path';
import { BrowserContext, chromium } from 'playwright';
import { REMOTE_BROWSER_URL } from '../../config';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import {
    extractNetworkErrorCode,
    getErrorMessage,
    isRemoteBrowserInfrastructureError,
    RemoteBrowserUnavailableError,
    sanitizeRemoteBrowserEndpoint,
} from './runBrowserErrors';

/**
 * Configuration for browser connection mode.
 *
 * @private internal type for `BrowserConnectionProvider`
 */
type BrowserConnectionMode = { readonly type: 'local' } | { readonly type: 'remote'; readonly wsEndpoint: string };

const DEFAULT_BROWSER_USER_DATA_DIR = join(tmpdir(), 'promptbook', 'browser', 'user-data');

/**
 * Default remote browser connect timeout in milliseconds.
 */
const DEFAULT_REMOTE_CONNECT_TIMEOUT_MS = 10_000;

/**
 * Default retry count for remote browser connection establishment.
 */
const DEFAULT_REMOTE_CONNECT_RETRIES = 2;

/**
 * Default initial retry delay for remote browser connection.
 */
const DEFAULT_REMOTE_CONNECT_BACKOFF_INITIAL_MS = 250;

/**
 * Default maximum retry delay for remote browser connection.
 */
const DEFAULT_REMOTE_CONNECT_BACKOFF_MAX_MS = 1_000;

/**
 * Default exponential multiplier for remote browser retry delay.
 */
const DEFAULT_REMOTE_CONNECT_BACKOFF_FACTOR = 4;

/**
 * Default retry jitter ratio for remote browser connection.
 */
const DEFAULT_REMOTE_CONNECT_JITTER_RATIO = 0.2;

/**
 * In-memory metrics counters for remote browser connect attempts.
 */
const REMOTE_BROWSER_CONNECT_METRICS = {
    success: 0,
    failure: 0,
};

/**
 * Runtime options used while acquiring a browser context.
 *
 * @private internal type for `BrowserConnectionProvider`
 */
export type BrowserContextRequestOptions = {
    /**
     * Optional signal to cancel connect retries and waits.
     */
    readonly signal?: AbortSignal;
    /**
     * Optional browser run session identifier for structured logs.
     */
    readonly sessionId?: string;
};

/**
 * Constructor options for BrowserConnectionProvider.
 *
 * @private internal type for `BrowserConnectionProvider`
 */
type BrowserConnectionProviderOptions = {
    /**
     * Enable verbose provider-level logs.
     */
    readonly isVerbose?: boolean;
    /**
     * Connect timeout for one remote Playwright websocket attempt.
     */
    readonly remoteConnectTimeoutMs?: number;
    /**
     * Number of retries after the initial remote connect attempt.
     */
    readonly remoteConnectRetries?: number;
    /**
     * Initial retry delay in milliseconds.
     */
    readonly remoteConnectBackoffInitialMs?: number;
    /**
     * Maximum retry delay in milliseconds.
     */
    readonly remoteConnectBackoffMaxMs?: number;
    /**
     * Retry delay multiplier.
     */
    readonly remoteConnectBackoffFactor?: number;
    /**
     * Retry jitter ratio.
     */
    readonly remoteConnectJitterRatio?: number;
    /**
     * Optional random provider used by retry jitter.
     */
    readonly random?: () => number;
    /**
     * Optional sleep provider for retry waits.
     */
    readonly sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

/**
 * Reads a positive integer from environment variables with a fallback default.
 */
function resolvePositiveIntFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Reads a positive number from environment variables with a fallback default.
 */
function resolvePositiveNumberFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseFloat(rawValue.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Reads a non-negative integer from environment variables with a fallback default.
 */
function resolveNonNegativeIntFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Reads a non-negative number from environment variables with a fallback default.
 */
function resolveNonNegativeNumberFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseFloat(rawValue.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Creates one standard abort error.
 */
function createAbortError(): Error {
    const error = new Error('Browser connection request was aborted.');
    error.name = 'AbortError';
    return error;
}

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
    private readonly remoteConnectTimeoutMs: number;
    private readonly remoteConnectRetries: number;
    private readonly remoteConnectBackoffInitialMs: number;
    private readonly remoteConnectBackoffMaxMs: number;
    private readonly remoteConnectBackoffFactor: number;
    private readonly remoteConnectJitterRatio: number;
    private readonly random: () => number;
    private readonly sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;

    /**
     * Creates a new BrowserConnectionProvider.
     *
     * @param options - Provider options
     * @param options.isVerbose - Enable verbose logging
     */
    public constructor(options: BrowserConnectionProviderOptions = {}) {
        this.isVerbose = options.isVerbose ?? false;
        this.remoteConnectTimeoutMs =
            options.remoteConnectTimeoutMs ??
            resolvePositiveIntFromEnv('RUN_BROWSER_CONNECT_TIMEOUT_MS', DEFAULT_REMOTE_CONNECT_TIMEOUT_MS);
        this.remoteConnectRetries =
            options.remoteConnectRetries ??
            resolveNonNegativeIntFromEnv('RUN_BROWSER_CONNECT_RETRIES', DEFAULT_REMOTE_CONNECT_RETRIES);
        this.remoteConnectBackoffInitialMs =
            options.remoteConnectBackoffInitialMs ??
            resolvePositiveIntFromEnv(
                'RUN_BROWSER_CONNECT_BACKOFF_INITIAL_MS',
                DEFAULT_REMOTE_CONNECT_BACKOFF_INITIAL_MS,
            );
        this.remoteConnectBackoffMaxMs =
            options.remoteConnectBackoffMaxMs ??
            resolvePositiveIntFromEnv('RUN_BROWSER_CONNECT_BACKOFF_MAX_MS', DEFAULT_REMOTE_CONNECT_BACKOFF_MAX_MS);
        this.remoteConnectBackoffFactor =
            options.remoteConnectBackoffFactor ??
            resolvePositiveNumberFromEnv('RUN_BROWSER_CONNECT_BACKOFF_FACTOR', DEFAULT_REMOTE_CONNECT_BACKOFF_FACTOR);
        this.remoteConnectJitterRatio =
            options.remoteConnectJitterRatio ??
            resolveNonNegativeNumberFromEnv('RUN_BROWSER_CONNECT_JITTER_RATIO', DEFAULT_REMOTE_CONNECT_JITTER_RATIO);
        this.random = options.random ?? Math.random;
        this.sleep = options.sleep;
    }

    /**
     * Gets a browser context, creating a new one if needed.
     *
     * This method automatically determines whether to use local or remote browser
     * based on the REMOTE_BROWSER_URL environment variable.
     *
     * @returns Browser context instance
     */
    public async getBrowserContext(options: BrowserContextRequestOptions = {}): Promise<BrowserContext> {
        if (options.signal?.aborted) {
            throw createAbortError();
        }

        // Check if we have a cached connection that's still valid
        if (this.browserContext !== null && this.isBrowserContextAlive(this.browserContext)) {
            return this.browserContext;
        }

        // Determine connection mode from configuration
        const mode = this.resolveConnectionMode();
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
            this.browserContext = await this.createRemoteBrowserContext(mode.wsEndpoint, options);
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

            await Promise.all(
                pages.map((page) =>
                    page.close().catch((error) => {
                        console.error('[BrowserConnectionProvider] Failed to close page', { error });
                    }),
                ),
            );
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
    private resolveConnectionMode(): BrowserConnectionMode {
        const remoteBrowserUrl = REMOTE_BROWSER_URL;

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

        const userDataDir = join(DEFAULT_BROWSER_USER_DATA_DIR, 'run-browser');
        await mkdir(userDataDir, { recursive: true });

        const launchOptions: NonNullable<Parameters<typeof chromium.launchPersistentContext>[1]> = {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        };

        try {
            const chromePath = await locateChrome();
            launchOptions.executablePath = chromePath;
        } catch (error) {
            if (this.isVerbose) {
                console.warn(
                    '[BrowserConnectionProvider] Could not locate system Chrome; using Playwright bundled Chromium',
                    {
                        error: error instanceof Error ? error.message : String(error),
                    },
                );
            }
        }

        return await chromium.launchPersistentContext(userDataDir, launchOptions);
    }

    /**
     * Creates a remote browser context by connecting to a Playwright server.
     *
     * @param wsEndpoint - WebSocket endpoint of the remote Playwright server
     * @returns Remote browser context
     */
    private async createRemoteBrowserContext(
        wsEndpoint: string,
        options: BrowserContextRequestOptions,
    ): Promise<BrowserContext> {
        const endpointDebug = sanitizeRemoteBrowserEndpoint(wsEndpoint);
        const startedAt = Date.now();

        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Connecting to remote browser', {
                endpoint: endpointDebug,
                connectTimeoutMs: this.remoteConnectTimeoutMs,
                retries: this.remoteConnectRetries,
            });
        }

        let attempts = 0;

        try {
            const connectResult = await retryWithBackoff(
                async (attempt) => {
                    attempts = attempt;
                    return await chromium.connect(wsEndpoint, {
                        timeout: this.remoteConnectTimeoutMs,
                    });
                },
                {
                    retries: this.remoteConnectRetries,
                    initialDelayMs: this.remoteConnectBackoffInitialMs,
                    maxDelayMs: this.remoteConnectBackoffMaxMs,
                    backoffFactor: this.remoteConnectBackoffFactor,
                    jitterRatio: this.remoteConnectJitterRatio,
                    signal: options.signal,
                    shouldRetry: (error) => isRemoteBrowserInfrastructureError(error),
                    onRetry: ({ attempt, delayMs, error }) => {
                        console.warn('[run_browser][retry]', {
                            tool: 'run_browser',
                            mode: 'remote-browser',
                            sessionId: options.sessionId || null,
                            event: 'remote_browser_connect_retry',
                            attempt,
                            delayMs,
                            endpoint: endpointDebug,
                            errorCode: extractNetworkErrorCode(error),
                            error: getErrorMessage(error),
                        });
                    },
                    random: this.random,
                    sleep: this.sleep,
                },
            );
            const browser = connectResult.value;

            // For remote connections, we need to create a new context
            // Note: Remote browsers don't support persistent contexts
            const context = await browser.newContext();
            REMOTE_BROWSER_CONNECT_METRICS.success++;

            console.info('[run_browser][metric]', {
                tool: 'run_browser',
                mode: 'remote-browser',
                sessionId: options.sessionId || null,
                event: 'remote_browser_connect_success',
                attempts: connectResult.attempts,
                connectDurationMs: connectResult.durationMs,
                endpoint: endpointDebug,
                counter: REMOTE_BROWSER_CONNECT_METRICS.success,
            });

            if (this.isVerbose) {
                console.info('[BrowserConnectionProvider] Successfully connected to remote browser');
            }

            return context;
        } catch (error) {
            REMOTE_BROWSER_CONNECT_METRICS.failure++;
            const durationMs = Date.now() - startedAt;
            const remoteInfraUnavailable = isRemoteBrowserInfrastructureError(error);

            if (remoteInfraUnavailable) {
                const remoteBrowserUnavailableError = new RemoteBrowserUnavailableError({
                    message: `Remote browser is unavailable. Could not establish a websocket connection.`,
                    debug: {
                        endpoint: endpointDebug,
                        attempts: Math.max(1, attempts),
                        connectTimeoutMs: this.remoteConnectTimeoutMs,
                        durationMs,
                        networkErrorCode: extractNetworkErrorCode(error),
                        originalMessage: getErrorMessage(error),
                    },
                    cause: error,
                });

                console.warn('[run_browser][metric]', {
                    tool: 'run_browser',
                    mode: 'remote-browser',
                    sessionId: options.sessionId || null,
                    event: 'remote_browser_connect_failure',
                    errorCode: remoteBrowserUnavailableError.code,
                    attempts: Math.max(1, attempts),
                    connectDurationMs: durationMs,
                    endpoint: endpointDebug,
                    counter: REMOTE_BROWSER_CONNECT_METRICS.failure,
                });

                throw remoteBrowserUnavailableError;
            }

            console.error('[run_browser][metric]', {
                tool: 'run_browser',
                mode: 'remote-browser',
                sessionId: options.sessionId || null,
                event: 'remote_browser_connect_failure',
                errorCode: 'REMOTE_BROWSER_CONNECT_ERROR',
                attempts: Math.max(1, attempts),
                connectDurationMs: durationMs,
                endpoint: endpointDebug,
                error: getErrorMessage(error),
                counter: REMOTE_BROWSER_CONNECT_METRICS.failure,
            });

            throw error;
        }
    }
}
