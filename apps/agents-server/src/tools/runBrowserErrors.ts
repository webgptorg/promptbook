import { KnowledgeScrapeError } from '../../../../src/errors/KnowledgeScrapeError';

/**
 * Structured error payload returned by the `run_browser` tool.
 */
export type RunBrowserToolError = {
    readonly code: string;
    readonly message: string;
    readonly isRetryable: boolean;
    readonly suggestedNextSteps: ReadonlyArray<string>;
    readonly debug: Record<string, unknown>;
};

/**
 * Metadata describing the sanitized remote browser endpoint used for debugging.
 */
export type RemoteBrowserEndpointDebug = {
    readonly protocol: string | null;
    readonly host: string | null;
    readonly port: number | null;
};

/**
 * Structured details captured when remote browser infrastructure is unavailable.
 */
export type RemoteBrowserUnavailableDebug = {
    readonly endpoint: RemoteBrowserEndpointDebug;
    readonly attempts: number;
    readonly connectTimeoutMs: number;
    readonly durationMs: number;
    readonly networkErrorCode: string | null;
    readonly originalMessage: string;
};

/**
 * Error code used for remote-browser infrastructure outages.
 */
export const REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE = 'REMOTE_BROWSER_UNAVAILABLE';

/**
 * Error thrown when a remote Playwright browser cannot be reached.
 */
export class RemoteBrowserUnavailableError extends KnowledgeScrapeError {
    public readonly code = REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE;
    public readonly isRetryable = true;
    public readonly suggestedNextSteps: ReadonlyArray<string>;
    public readonly debug: RemoteBrowserUnavailableDebug;

    public constructor(options: {
        readonly message: string;
        readonly debug: RemoteBrowserUnavailableDebug;
        readonly suggestedNextSteps?: ReadonlyArray<string>;
        readonly cause?: unknown;
    }) {
        super(options.message);
        this.debug = options.debug;
        this.suggestedNextSteps =
            options.suggestedNextSteps ??
            [
                'Verify remote browser infrastructure is running and reachable from Agents Server.',
                'Check firewall and DNS routing for the remote browser host and port.',
                'Retry later or continue with non-graphical fallback scraping.',
            ];

        (this as Error & { cause?: unknown }).cause = options.cause;
        Object.setPrototypeOf(this, RemoteBrowserUnavailableError.prototype);
    }
}

/**
 * Returns true when an unknown value is one of the remote-browser outage errors.
 */
export function isRemoteBrowserUnavailableError(error: unknown): error is RemoteBrowserUnavailableError {
    return error instanceof RemoteBrowserUnavailableError;
}

/**
 * Sanitizes a remote websocket endpoint so debug payloads never expose path secrets.
 */
export function sanitizeRemoteBrowserEndpoint(wsEndpoint: string): RemoteBrowserEndpointDebug {
    try {
        const parsedEndpoint = new URL(wsEndpoint);
        return {
            protocol: parsedEndpoint.protocol || null,
            host: parsedEndpoint.hostname || null,
            port: parsedEndpoint.port ? Number.parseInt(parsedEndpoint.port, 10) : null,
        };
    } catch {
        const hostPortMatch = wsEndpoint.trim().match(
            /^(?:wss?:\/\/)?(?<host>[^:/?#]+)(?::(?<port>\d{1,5}))?/i,
        );
        const host = hostPortMatch?.groups?.host || null;
        const parsedPort = hostPortMatch?.groups?.port;
        return {
            protocol: wsEndpoint.startsWith('wss://') ? 'wss:' : wsEndpoint.startsWith('ws://') ? 'ws:' : null,
            host,
            port: parsedPort ? Number.parseInt(parsedPort, 10) : null,
        };
    }
}

/**
 * Extracts network-like error code from unknown error payload.
 */
export function extractNetworkErrorCode(error: unknown): string | null {
    if (error && typeof error === 'object') {
        const maybeCode = (error as { code?: unknown }).code;
        if (typeof maybeCode === 'string' && maybeCode.trim()) {
            return maybeCode.trim().toUpperCase();
        }
    }

    const message = getErrorMessage(error);
    const match = message.match(/\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET|EHOSTUNREACH|ENETUNREACH)\b/i);

    return match?.[1]?.toUpperCase() || null;
}

/**
 * Classifies whether an unknown error most likely represents remote browser infra outage.
 */
export function isRemoteBrowserInfrastructureError(error: unknown): boolean {
    const networkErrorCode = extractNetworkErrorCode(error);
    if (networkErrorCode) {
        return true;
    }

    const message = getErrorMessage(error).toLowerCase();
    const isWebSocketFailure =
        message.includes('websocket') ||
        message.includes('<ws error>') ||
        message.includes('ws connect error') ||
        message.includes('socket hang up');
    const hasHandshakeFailure =
        message.includes('unexpected server response') ||
        message.includes('handshake') ||
        message.includes('code=1006') ||
        message.includes('disconnected');

    return isWebSocketFailure && hasHandshakeFailure;
}

/**
 * Converts unknown thrown values into safe string messages.
 */
export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Converts unknown errors into stack payloads that are safe to render in debug mode.
 */
export function getErrorStack(error: unknown): string | null {
    return error instanceof Error && error.stack ? error.stack : null;
}
