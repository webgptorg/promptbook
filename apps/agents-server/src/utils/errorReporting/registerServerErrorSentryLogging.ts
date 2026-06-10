import { inspect } from 'node:util';
import { DEFAULT_APPLICATION_ERROR_SERVER_NAME } from './applicationErrorHandling';
import {
    createSentryTimestamp,
    resolveOptionalSentryDsn,
    sendSentryStorePayload,
    type SentryStorePayload,
} from './sentryStore';

/**
 * Logger name visible in Sentry events for server-side `console.error` calls.
 */
const SENTRY_SERVER_ERROR_LOGGER = 'agents-server.server-error';

/**
 * Marker used to keep the global console bridge idempotent across hot reloads.
 */
const SERVER_ERROR_SENTRY_LOGGING_STATE_SYMBOL = Symbol.for('promptbook.agents-server.serverErrorSentryLoggingState');

/**
 * Default label used when `console.error` is called without a string or error object.
 */
const DEFAULT_SERVER_ERROR_MESSAGE = 'Agents Server console.error';

/**
 * Keys that commonly hold nested error payloads inside structured logs.
 */
const NESTED_ERROR_PROPERTY_NAMES = ['error', 'cause', 'reason'] as const;

/**
 * Maximum traversal depth when looking for nested error-like objects.
 */
const MAX_ERROR_SEARCH_DEPTH = 2;

/**
 * Shared global state for the server-side console bridge.
 */
type ServerErrorSentryLoggingState = {
    /**
     * Original console implementation preserved before patching.
     */
    originalConsoleError: typeof console.error | null;

    /**
     * True once the bridge has been installed.
     */
    isRegistered: boolean;
};

/**
 * Normalized error details extracted from logged values.
 */
type LoggedErrorInfo = {
    /**
     * Best available error type.
     */
    name: string;

    /**
     * Best available error message.
     */
    message: string;

    /**
     * Optional stack trace when present.
     */
    stack?: string;
};

/**
 * Registers one server-side `console.error` bridge that forwards logs to Sentry.
 */
export function registerServerErrorSentryLogging(): void {
    const loggingState = getServerErrorSentryLoggingState();

    if (loggingState.isRegistered) {
        return;
    }

    loggingState.originalConsoleError = console.error.bind(console);
    console.error = (...consoleArguments: unknown[]): void => {
        loggingState.originalConsoleError?.(...consoleArguments);

        const sentryDsn = resolveOptionalSentryDsn();
        if (!sentryDsn) {
            return;
        }

        const sentryPayload = createServerErrorSentryStorePayload(consoleArguments);

        // Never log reporting failures through `console.error`, otherwise a broken Sentry configuration would recurse.
        void sendSentryStorePayload(sentryPayload, sentryDsn).catch(() => undefined);
    };

    loggingState.isRegistered = true;
}

/**
 * Restores the original `console.error` implementation after tests patch it.
 *
 * @private test helper for server-side Sentry console forwarding
 */
export function $resetServerErrorSentryLoggingForTests(): void {
    const loggingState = getServerErrorSentryLoggingState();

    if (loggingState.originalConsoleError) {
        console.error = loggingState.originalConsoleError;
    }

    loggingState.originalConsoleError = null;
    loggingState.isRegistered = false;
}

/**
 * Returns the shared mutable global state used by the bridge.
 *
 * @returns Shared state object reused across reloads.
 */
function getServerErrorSentryLoggingState(): ServerErrorSentryLoggingState {
    const globalObject = globalThis as typeof globalThis & Record<PropertyKey, unknown>;

    const existingLoggingState = globalObject[
        SERVER_ERROR_SENTRY_LOGGING_STATE_SYMBOL
    ] as ServerErrorSentryLoggingState | undefined;
    if (existingLoggingState) {
        return existingLoggingState;
    }

    const newLoggingState: ServerErrorSentryLoggingState = {
        originalConsoleError: null,
        isRegistered: false,
    };

    globalObject[SERVER_ERROR_SENTRY_LOGGING_STATE_SYMBOL] = newLoggingState;
    return newLoggingState;
}

/**
 * Creates one Sentry store payload from a `console.error` call.
 *
 * @param consoleArguments - Original `console.error` arguments.
 * @returns Structured Sentry event payload.
 */
function createServerErrorSentryStorePayload(consoleArguments: readonly unknown[]): SentryStorePayload {
    const loggedError = findLoggedErrorInfo(consoleArguments);

    return {
        platform: 'javascript',
        level: 'error',
        logger: SENTRY_SERVER_ERROR_LOGGER,
        timestamp: createSentryTimestamp(),
        message: createServerErrorMessage(consoleArguments, loggedError),
        server_name: process.env.NEXT_PUBLIC_SERVER_NAME ?? DEFAULT_APPLICATION_ERROR_SERVER_NAME,
        tags: {
            source: 'agents-server.console-error',
            nextRuntime: process.env.NEXT_RUNTIME ?? 'nodejs',
            nodeEnv: process.env.NODE_ENV ?? 'unknown',
        },
        exception: loggedError
            ? {
                  values: [
                      {
                          type: loggedError.name,
                          value: loggedError.message,
                      },
                  ],
              }
            : undefined,
        extra: {
            consoleArguments: consoleArguments.map(serializeConsoleArgument),
            errorStack: loggedError?.stack ?? null,
            vercelEnv: process.env.VERCEL_ENV ?? null,
            vercelRegion: process.env.VERCEL_REGION ?? null,
            vercelUrl: process.env.VERCEL_URL ?? null,
        },
    };
}

/**
 * Creates one stable event message from a `console.error` call.
 *
 * @param consoleArguments - Original `console.error` arguments.
 * @param loggedError - First extracted error-like payload when available.
 * @returns Event message suitable for Sentry grouping and scanning.
 */
function createServerErrorMessage(
    consoleArguments: readonly unknown[],
    loggedError: LoggedErrorInfo | null,
): string {
    const stringMessage = consoleArguments
        .filter((consoleArgument): consoleArgument is string => typeof consoleArgument === 'string')
        .map((consoleArgument) => consoleArgument.trim())
        .filter(Boolean)
        .join(' ')
        .trim();

    if (stringMessage && loggedError?.message && !stringMessage.includes(loggedError.message)) {
        return `${stringMessage} ${loggedError.message}`.trim();
    }

    if (stringMessage) {
        return stringMessage;
    }

    if (loggedError?.message) {
        return loggedError.message;
    }

    const firstConsoleArgument = consoleArguments.at(0);
    if (firstConsoleArgument !== undefined) {
        return serializeConsoleArgument(firstConsoleArgument);
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
}

/**
 * Extracts the first meaningful error-like payload from structured console arguments.
 *
 * @param consoleArguments - Original `console.error` arguments.
 * @returns Normalized logged error payload or `null`.
 */
function findLoggedErrorInfo(consoleArguments: readonly unknown[]): LoggedErrorInfo | null {
    const visitedObjects = new WeakSet<object>();

    for (const consoleArgument of consoleArguments) {
        const loggedError = findLoggedErrorInfoInValue(consoleArgument, visitedObjects, 0);
        if (loggedError) {
            return loggedError;
        }
    }

    return null;
}

/**
 * Recursively searches one logged value for error-like payloads.
 *
 * @param value - Current logged value.
 * @param visitedObjects - Cycle guard for nested objects.
 * @param depth - Current recursion depth.
 * @returns Normalized logged error payload or `null`.
 */
function findLoggedErrorInfoInValue(
    value: unknown,
    visitedObjects: WeakSet<object>,
    depth: number,
): LoggedErrorInfo | null {
    if (value instanceof Error) {
        return {
            name: value.name || 'Error',
            message: value.message || DEFAULT_SERVER_ERROR_MESSAGE,
            stack: value.stack,
        };
    }

    if (!value || typeof value !== 'object') {
        return null;
    }

    if (visitedObjects.has(value)) {
        return null;
    }
    visitedObjects.add(value);

    const normalizedErrorInfo = normalizeLoggedErrorInfo(value as Record<string, unknown>);
    if (normalizedErrorInfo) {
        return normalizedErrorInfo;
    }

    if (depth >= MAX_ERROR_SEARCH_DEPTH) {
        return null;
    }

    for (const propertyName of NESTED_ERROR_PROPERTY_NAMES) {
        if (!(propertyName in value)) {
            continue;
        }

        const nestedErrorInfo = findLoggedErrorInfoInValue(
            (value as Record<string, unknown>)[propertyName],
            visitedObjects,
            depth + 1,
        );
        if (nestedErrorInfo) {
            return nestedErrorInfo;
        }
    }

    return null;
}

/**
 * Converts one plain object into normalized error details when it looks like an error.
 *
 * @param value - Plain logged object.
 * @returns Normalized logged error payload or `null`.
 */
function normalizeLoggedErrorInfo(value: Record<string, unknown>): LoggedErrorInfo | null {
    const rawErrorName = typeof value.name === 'string' ? value.name.trim() : '';
    const rawErrorMessage = typeof value.message === 'string' ? value.message.trim() : '';
    const rawErrorStack = typeof value.stack === 'string' ? value.stack.trim() : '';

    if (!rawErrorName && !rawErrorStack) {
        return null;
    }

    return {
        name: rawErrorName || 'Error',
        message: rawErrorMessage || DEFAULT_SERVER_ERROR_MESSAGE,
        stack: rawErrorStack || undefined,
    };
}

/**
 * Serializes one logged console value into a stable string representation.
 *
 * @param value - Original console argument.
 * @returns Stable string suitable for Sentry `extra`.
 */
function serializeConsoleArgument(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    return inspect(value, {
        depth: 6,
        breakLength: 120,
        maxArrayLength: 50,
    });
}
