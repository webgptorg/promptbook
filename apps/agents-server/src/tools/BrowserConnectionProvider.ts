import { mkdir } from 'fs/promises';
import { Browser, BrowserContext, chromium } from 'playwright';
import { resolvePromptbookTemporaryPath } from '../../../../src/utils/filesystem/promptbookTemporaryPath';
import { REMOTE_BROWSER_URL } from '../../config';
import { createServerChromiumLaunchOptions } from './createServerChromiumLaunchOptions';
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

/**
 * Constant for default browser user data dir.
 */
const DEFAULT_BROWSER_USER_DATA_DIR = resolvePromptbookTemporaryPath(
    process.cwd(),
    'agents-server',
    'browser',
    'user-data',
);

/**
 * Cache key used for the shared default browser context without an agent profile.
 */
const DEFAULT_BROWSER_PROFILE_KEY = 'default';

/**
 * Default idle time after which one unused browser context (with no open pages) is closed.
 *
 * The persistent profile directory outlives the closed browser, so closing idle contexts frees
 * server resources without losing any cookies or sessions.
 */
const DEFAULT_BROWSER_CONTEXT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Interval between idle-context sweeps.
 */
const BROWSER_CONTEXT_IDLE_SWEEP_INTERVAL_MS = 60 * 1000;

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
    /**
     * Optional persistent browser-profile directory (Playwright user data dir) of one agent.
     *
     * When set, the browser context is launched on this profile so cookies, sessions and other
     * browser data persist across sessions. When omitted, the shared default profile is used.
     */
    readonly browserProfileDirectory?: string | null;
};

/**
 * One cached browser context together with its lifecycle metadata.
 *
 * @private internal type for `BrowserConnectionProvider`
 */
type ManagedBrowserContext = {
    /**
     * The cached Playwright browser context.
     */
    readonly context: BrowserContext;
    /**
     * Remote browser connection owning the context, `null` in local mode.
     */
    readonly remoteBrowser: Browser | null;
    /**
     * Connection mode used to create the context.
     */
    readonly mode: BrowserConnectionMode;
    /**
     * Timestamp of the last context acquisition, used by the idle sweep.
     */
    lastUsedAt: number;
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
     * Idle time after which one unused browser context (with no open pages) is closed.
     */
    readonly contextIdleTimeoutMs?: number;
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
 * Contexts are cached per browser-profile directory so every agent can browse in its own
 * persistent isolated profile. Contexts without open pages are closed after an idle timeout -
 * the profile data on disk stays permanent, only the browser process is released.
 *
 * Note: Remote Playwright browsers do not support persistent user-data profiles, so in remote
 * mode the per-profile contexts are isolated from each other but survive only for one connection.
 *
 * The remote mode is useful for environments like Vercel where running a full browser
 * is not possible due to resource constraints.
 *
 * @private internal utility for Agents Server browser tools
 */
export class BrowserConnectionProvider {
    private readonly managedBrowserContexts = new Map<string, ManagedBrowserContext>();
    private readonly pendingBrowserContextCreations = new Map<string, Promise<BrowserContext>>();
    private idleSweepTimer: ReturnType<typeof setInterval> | null = null;
    private readonly contextIdleTimeoutMs: number;
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
        this.contextIdleTimeoutMs =
            options.contextIdleTimeoutMs ??
            resolvePositiveIntFromEnv('RUN_BROWSER_CONTEXT_IDLE_TIMEOUT_MS', DEFAULT_BROWSER_CONTEXT_IDLE_TIMEOUT_MS);
        this.random = options.random ?? Math.random;
        this.sleep = options.sleep;
    }

    /**
     * Gets a browser context, creating a new one if needed.
     *
     * This method automatically determines whether to use local or remote browser
     * based on the REMOTE_BROWSER_URL environment variable.
     *
     * Contexts are cached per `browserProfileDirectory` so agents with a persistent
     * browser profile never share cookies or sessions with each other.
     *
     * @returns Browser context instance
     */
    public async getBrowserContext(options: BrowserContextRequestOptions = {}): Promise<BrowserContext> {
        if (options.signal?.aborted) {
            throw createAbortError();
        }

        const browserProfileDirectory = options.browserProfileDirectory?.trim() || null;
        const profileKey = browserProfileDirectory ?? DEFAULT_BROWSER_PROFILE_KEY;

        // Check if we have a cached connection that's still valid
        const cachedManagedContext = this.managedBrowserContexts.get(profileKey);
        if (cachedManagedContext && this.isBrowserContextAlive(cachedManagedContext.context)) {
            cachedManagedContext.lastUsedAt = Date.now();
            return cachedManagedContext.context;
        }
        this.managedBrowserContexts.delete(profileKey);

        // Concurrent requests for the same profile must share one creation - a persistent
        // Chromium profile directory can only be opened by one browser process at a time
        const pendingCreation = this.pendingBrowserContextCreations.get(profileKey);
        if (pendingCreation) {
            return await pendingCreation;
        }

        const creation = this.createManagedBrowserContext(profileKey, browserProfileDirectory, options);
        this.pendingBrowserContextCreations.set(profileKey, creation);
        try {
            return await creation;
        } finally {
            this.pendingBrowserContextCreations.delete(profileKey);
        }
    }

    /**
     * Creates and caches one browser context for the requested profile.
     *
     * @param profileKey - Cache key of the created context.
     * @param browserProfileDirectory - Persistent per-agent profile directory or `null` for the shared default profile.
     * @param options - Runtime request options.
     * @returns Created browser context.
     */
    private async createManagedBrowserContext(
        profileKey: string,
        browserProfileDirectory: string | null,
        options: BrowserContextRequestOptions,
    ): Promise<BrowserContext> {
        // Determine connection mode from configuration
        const mode = this.resolveConnectionMode();

        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Creating new browser context', {
                mode: mode.type,
                profileKey,
                wsEndpoint: mode.type === 'remote' ? mode.wsEndpoint : undefined,
            });
        }

        // Create new browser context based on mode
        let managedContext: ManagedBrowserContext;
        if (mode.type === 'local') {
            managedContext = {
                context: await this.createLocalBrowserContext(browserProfileDirectory),
                remoteBrowser: null,
                mode,
                lastUsedAt: Date.now(),
            };
        } else {
            const { context, browser } = await this.createRemoteBrowserContext(mode.wsEndpoint, options);
            managedContext = {
                context,
                remoteBrowser: browser,
                mode,
                lastUsedAt: Date.now(),
            };
        }

        this.managedBrowserContexts.set(profileKey, managedContext);
        this.ensureIdleSweepTimerIsRunning();

        return managedContext.context;
    }

    /**
     * Closes all pages in all cached browser contexts.
     *
     * This method is useful for cleanup between agent tasks without closing
     * the browser instances themselves.
     */
    public async closeAllPages(): Promise<void> {
        for (const managedContext of this.managedBrowserContexts.values()) {
            try {
                const pages = managedContext.context.pages();

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
    }

    /**
     * Closes all cached browser contexts and disconnects from remote browsers.
     *
     * This should be called when the browser is no longer needed to free up resources.
     * For local mode, this closes the browser processes (the persistent profile directories stay
     * on disk). For remote mode, it disconnects from the remote browser but doesn't shut down
     * the remote server.
     */
    public async close(): Promise<void> {
        this.stopIdleSweepTimer();

        const managedContextEntries = [...this.managedBrowserContexts.entries()];
        this.managedBrowserContexts.clear();

        for (const [profileKey, managedContext] of managedContextEntries) {
            await this.closeManagedBrowserContext(profileKey, managedContext);
        }
    }

    /**
     * Closes one cached browser context together with its remote connection when present.
     *
     * @param profileKey - Cache key of the closed context.
     * @param managedContext - Context to close.
     */
    private async closeManagedBrowserContext(profileKey: string, managedContext: ManagedBrowserContext): Promise<void> {
        try {
            if (this.isVerbose) {
                console.info('[BrowserConnectionProvider] Closing browser context', {
                    mode: managedContext.mode.type,
                    profileKey,
                });
            }

            await managedContext.context.close();
        } catch (error) {
            console.error('[BrowserConnectionProvider] Error closing browser context', { error, profileKey });
        }

        if (managedContext.remoteBrowser) {
            try {
                await managedContext.remoteBrowser.close();
            } catch (error) {
                console.error('[BrowserConnectionProvider] Error disconnecting remote browser', { error, profileKey });
            }
        }
    }

    /**
     * Starts the periodic idle sweep releasing browser contexts that are no longer used.
     *
     * The timer is unreferenced so it never keeps the Node process alive.
     */
    private ensureIdleSweepTimerIsRunning(): void {
        if (this.idleSweepTimer !== null) {
            return;
        }

        this.idleSweepTimer = setInterval(() => {
            void this.closeIdleBrowserContexts();
        }, BROWSER_CONTEXT_IDLE_SWEEP_INTERVAL_MS);
        (this.idleSweepTimer as { unref?: () => void }).unref?.();
    }

    /**
     * Stops the periodic idle sweep.
     */
    private stopIdleSweepTimer(): void {
        if (this.idleSweepTimer !== null) {
            clearInterval(this.idleSweepTimer);
            this.idleSweepTimer = null;
        }
    }

    /**
     * Closes cached browser contexts that have no open pages and were idle beyond the timeout.
     *
     * Persistent profile data stays on disk - only the running browser is released so the server
     * does not keep browsers alive while no agent or user is using them.
     */
    private async closeIdleBrowserContexts(): Promise<void> {
        const now = Date.now();

        for (const [profileKey, managedContext] of this.managedBrowserContexts.entries()) {
            if (now - managedContext.lastUsedAt < this.contextIdleTimeoutMs) {
                continue;
            }

            let openPageCount = 0;
            try {
                openPageCount = managedContext.context.pages().length;
            } catch {
                openPageCount = 0;
            }

            if (openPageCount > 0) {
                managedContext.lastUsedAt = now;
                continue;
            }

            this.managedBrowserContexts.delete(profileKey);
            await this.closeManagedBrowserContext(profileKey, managedContext);
        }

        if (this.managedBrowserContexts.size === 0) {
            this.stopIdleSweepTimer();
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
     * @param browserProfileDirectory - Persistent per-agent profile directory or `null` for the shared default profile.
     * @returns Local browser context
     */
    private async createLocalBrowserContext(browserProfileDirectory: string | null): Promise<BrowserContext> {
        if (this.isVerbose) {
            console.info('[BrowserConnectionProvider] Launching local browser context', {
                browserProfileDirectory,
            });
        }

        const userDataDir = browserProfileDirectory ?? `${DEFAULT_BROWSER_USER_DATA_DIR}/run-browser`;
        await mkdir(userDataDir, { recursive: true });

        const launchOptions = await createServerChromiumLaunchOptions();

        return await chromium.launchPersistentContext(userDataDir, launchOptions);
    }

    /**
     * Creates a remote browser context by connecting to a Playwright server.
     *
     * @param wsEndpoint - WebSocket endpoint of the remote Playwright server
     * @returns Remote browser context together with its owning connection
     */
    private async createRemoteBrowserContext(
        wsEndpoint: string,
        options: BrowserContextRequestOptions,
    ): Promise<{ context: BrowserContext; browser: Browser }> {
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
            // Note: Remote browsers don't support persistent contexts, so per-agent isolation is
            // provided by separate contexts but the profile data is not persisted remotely
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

            return { context, browser };
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
