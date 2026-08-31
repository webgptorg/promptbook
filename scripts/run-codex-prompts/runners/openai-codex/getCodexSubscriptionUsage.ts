import { spawn } from 'child_process';
import { createInterface } from 'readline';
import type { HarnessSubscriptionUsage, HarnessSubscriptionUsageLimit } from '../types/HarnessSubscriptionUsage';

/**
 * Arguments which start the Codex app server over JSON-RPC stdio.
 */
const CODEX_APP_SERVER_ARGUMENTS = ['app-server', '--stdio'];

/**
 * Maximum time spent waiting for the optional Codex account-rate-limit snapshot.
 */
const CODEX_SUBSCRIPTION_USAGE_REQUEST_TIMEOUT_MS = 10 * 1000;

/**
 * JSON-RPC request id used for the required app-server initialization handshake.
 */
const INITIALIZE_REQUEST_ID = 1;

/**
 * JSON-RPC request id used for the Codex account rate-limit snapshot.
 */
const RATE_LIMITS_REQUEST_ID = 2;

/**
 * Client name sent to the Codex app server while Promptbook reads subscription limits.
 */
const PROMPTBOOK_CODEX_APP_SERVER_CLIENT_NAME = 'ptbk-coder';

/**
 * Client version sent to the Codex app server while Promptbook reads subscription limits.
 *
 * The app-server protocol only requires a non-empty version string, and the CLI's own version is intentionally not
 * coupled to Promptbook's package version.
 */
const PROMPTBOOK_CODEX_APP_SERVER_CLIENT_VERSION = '1';

/**
 * One JSON object received through the Codex app-server JSON-RPC transport.
 */
type JsonRecord = Record<string, unknown>;

/**
 * Raw Codex app-server rate-limit snapshot paired with its optional multi-bucket identifier.
 */
type CodexRateLimitSnapshot = {
    readonly identifier?: string;
    readonly value: JsonRecord;
};

/**
 * Reads the current Codex subscription limit windows through its local app-server protocol.
 *
 * Codex versions without this optional protocol, API-key sessions, and transient account failures simply provide no
 * snapshot. Subscription usage is contextual UI information, so it must never make a coding prompt fail.
 *
 * @private internal utility of the OpenAI Codex runner
 */
export async function getCodexSubscriptionUsage(codexCommand: string): Promise<HarnessSubscriptionUsage | undefined> {
    try {
        return await requestCodexSubscriptionUsage(codexCommand);
    } catch {
        return undefined;
    }
}

/**
 * Performs the small Codex app-server JSON-RPC exchange which reads rate limits.
 *
 * The app server requires a completed `initialize` handshake before it accepts account methods. Closing standard input
 * after the response lets the short-lived helper exit without sharing the lifecycle of the coding process itself.
 *
 * @private helper of `getCodexSubscriptionUsage`
 */
function requestCodexSubscriptionUsage(codexCommand: string): Promise<HarnessSubscriptionUsage | undefined> {
    return new Promise((resolve) => {
        const codexAppServerProcess = spawn(codexCommand, CODEX_APP_SERVER_ARGUMENTS, {
            shell: process.platform === 'win32',
            stdio: 'pipe',
        });
        const outputReader = createInterface({ input: codexAppServerProcess.stdout });
        let requestTimeout: NodeJS.Timeout | undefined;
        let isSettled = false;

        // Draining stderr prevents a protocol diagnostic from blocking the short-lived child process. The response is
        // deliberately not surfaced because missing usage must not distract from an otherwise healthy coding run.
        codexAppServerProcess.stderr.resume();
        codexAppServerProcess.stdin.on('error', () => undefined);

        /**
         * Stops the helper process and settles this optional request exactly once.
         */
        const settle = (subscriptionUsage: HarnessSubscriptionUsage | undefined): void => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            if (requestTimeout) {
                clearTimeout(requestTimeout);
            }

            outputReader.close();
            codexAppServerProcess.stdin.end();

            if (codexAppServerProcess.exitCode === null && !codexAppServerProcess.killed) {
                codexAppServerProcess.kill();
            }

            resolve(subscriptionUsage);
        };

        /**
         * Sends one JSON-RPC message to the Codex app server.
         */
        const sendJsonRpcMessage = (message: JsonRecord): void => {
            try {
                codexAppServerProcess.stdin.write(`${JSON.stringify(message)}\n`);
            } catch {
                settle(undefined);
            }
        };

        requestTimeout = setTimeout(() => settle(undefined), CODEX_SUBSCRIPTION_USAGE_REQUEST_TIMEOUT_MS);
        codexAppServerProcess.on('error', () => settle(undefined));
        codexAppServerProcess.on('close', () => settle(undefined));

        outputReader.on('line', (line) => {
            const response = parseJsonRecord(line);

            if (!response) {
                return;
            }

            if (response.id === INITIALIZE_REQUEST_ID) {
                if (!isJsonRecord(response.result)) {
                    settle(undefined);
                    return;
                }

                sendJsonRpcMessage({ jsonrpc: '2.0', method: 'initialized' });
                sendJsonRpcMessage({
                    jsonrpc: '2.0',
                    id: RATE_LIMITS_REQUEST_ID,
                    method: 'account/rateLimits/read',
                });
                return;
            }

            if (response.id === RATE_LIMITS_REQUEST_ID) {
                settle(buildCodexSubscriptionUsage(response.result));
            }
        });

        sendJsonRpcMessage({
            jsonrpc: '2.0',
            id: INITIALIZE_REQUEST_ID,
            method: 'initialize',
            params: {
                clientInfo: {
                    name: PROMPTBOOK_CODEX_APP_SERVER_CLIENT_NAME,
                    version: PROMPTBOOK_CODEX_APP_SERVER_CLIENT_VERSION,
                },
                capabilities: {
                    experimentalApi: true,
                },
            },
        });
    });
}

/**
 * Converts the raw Codex app-server rate-limit response into Promptbook's harness-neutral subscription snapshot.
 *
 * Modern Codex versions can report several metered buckets, while older versions expose a single compatibility
 * bucket. In both cases every primary and secondary rolling window is preserved for the terminal dashboard.
 *
 * @private internal utility of the OpenAI Codex runner
 */
export function buildCodexSubscriptionUsage(response: unknown): HarnessSubscriptionUsage | undefined {
    if (!isJsonRecord(response)) {
        return undefined;
    }

    const snapshots = resolveCodexRateLimitSnapshots(response);
    const hasMultipleSnapshots = snapshots.length > 1;
    const limits = snapshots.flatMap(({ identifier, value }) =>
        buildCodexSubscriptionUsageLimits({
            snapshot: value,
            identifier,
            hasMultipleSnapshots,
        }),
    );

    return limits.length === 0 ? undefined : { limits };
}

/**
 * Resolves either Codex's multi-bucket rate-limit response or its compatible single-bucket fallback.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function resolveCodexRateLimitSnapshots(response: JsonRecord): readonly CodexRateLimitSnapshot[] {
    const rateLimitsByLimitId = response.rateLimitsByLimitId;

    if (isJsonRecord(rateLimitsByLimitId)) {
        const snapshots = Object.entries(rateLimitsByLimitId)
            .filter(([, value]) => isJsonRecord(value))
            .map(([identifier, value]) => ({ identifier, value: value as JsonRecord }));

        if (snapshots.length > 0) {
            return snapshots;
        }
    }

    return isJsonRecord(response.rateLimits) ? [{ value: response.rateLimits }] : [];
}

/**
 * Creates every displayed rolling window from one Codex rate-limit bucket.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function buildCodexSubscriptionUsageLimits(options: {
    readonly snapshot: JsonRecord;
    readonly identifier?: string;
    readonly hasMultipleSnapshots: boolean;
}): readonly HarnessSubscriptionUsageLimit[] {
    const { snapshot, identifier, hasMultipleSnapshots } = options;
    const bucketLabel = hasMultipleSnapshots ? readString(snapshot.limitName) ?? identifier : undefined;

    return [
        buildCodexSubscriptionUsageLimit(snapshot.primary, bucketLabel, 'Primary'),
        buildCodexSubscriptionUsageLimit(snapshot.secondary, bucketLabel, 'Secondary'),
    ].filter((limit): limit is HarnessSubscriptionUsageLimit => limit !== undefined);
}

/**
 * Converts one raw Codex rate-limit window to a displayable subscription usage limit.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function buildCodexSubscriptionUsageLimit(
    rawWindow: unknown,
    bucketLabel: string | undefined,
    fallbackWindowLabel: string,
): HarnessSubscriptionUsageLimit | undefined {
    if (!isJsonRecord(rawWindow)) {
        return undefined;
    }

    const usedPercentage = readPercentage(rawWindow.usedPercent);

    if (usedPercentage === undefined) {
        return undefined;
    }

    const windowLabel = formatCodexRateLimitWindowDuration(rawWindow.windowDurationMins) ?? fallbackWindowLabel;
    const label = bucketLabel ? `${bucketLabel} ${windowLabel}` : windowLabel;
    const resetsAt = readUnixTimestamp(rawWindow.resetsAt);

    return {
        label,
        usedPercentage,
        ...(resetsAt !== undefined && { resetsAt }),
    };
}

/**
 * Formats the duration of one Codex rolling rate-limit window for compact terminal display.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function formatCodexRateLimitWindowDuration(value: unknown): string | undefined {
    const durationMinutes = readNonNegativeFiniteNumber(value);

    if (durationMinutes === undefined || durationMinutes === 0) {
        return undefined;
    }

    const MINUTES_PER_HOUR = 60;
    const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

    if (durationMinutes % MINUTES_PER_DAY === 0) {
        return `${durationMinutes / MINUTES_PER_DAY}d`;
    }

    if (durationMinutes % MINUTES_PER_HOUR === 0) {
        return `${durationMinutes / MINUTES_PER_HOUR}h`;
    }

    return `${durationMinutes}m`;
}

/**
 * Parses one JSON-RPC line when it is an object.
 *
 * @private helper of `getCodexSubscriptionUsage`
 */
function parseJsonRecord(line: string): JsonRecord | undefined {
    try {
        const value = JSON.parse(line) as unknown;
        return isJsonRecord(value) ? value : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Checks whether a value is a JSON object.
 *
 * @private helper of `getCodexSubscriptionUsage`
 */
function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one non-empty string from an untrusted JSON object.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Reads a finite number which cannot be negative.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function readNonNegativeFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Reads a valid percentage from the Codex app-server response.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function readPercentage(value: unknown): number | undefined {
    const percentage = readNonNegativeFiniteNumber(value);
    return percentage !== undefined && percentage <= 100 ? percentage : undefined;
}

/**
 * Reads a Unix timestamp in seconds from the Codex app-server response.
 *
 * @private helper of `buildCodexSubscriptionUsage`
 */
function readUnixTimestamp(value: unknown): number | undefined {
    const timestamp = readNonNegativeFiniteNumber(value);
    return timestamp !== undefined && timestamp > 0 ? timestamp : undefined;
}
