/**
 * Default bound of one read-only runtime request (local services answer quickly; a slow one is reported, not awaited).
 */
const REQUEST_TIMEOUT_MS = 4_000;

/**
 * A failed runtime request with its HTTP status (0 when the service could not be reached).
 *
 * @private inference runtime http
 */
export class RuntimeRequestError extends Error {
    public constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
    }
}

/**
 * Combines a caller's cancellation with a timeout.
 */
function boundedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
    const timeout = AbortSignal.timeout(timeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Sends one JSON request to a runtime service and parses its JSON answer.
 *
 * @private inference runtime http
 */
export async function runtimeJson<T>(url: string, options: { readonly method?: string; readonly body?: unknown; readonly signal?: AbortSignal; readonly timeoutMs?: number } = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(url, {
            method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
            headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: boundedSignal(options.signal, options.timeoutMs ?? REQUEST_TIMEOUT_MS),
            // A fresh connection per request: a restarted service never sees a reused keep-alive socket.
            keepalive: false,
        });
    } catch (error) {
        throw new RuntimeRequestError(`not reachable (${(error as Error).name === 'TimeoutError' ? 'timed out' : ((error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message)})`, 0);
    }
    const text = await response.text();
    if (!response.ok) {
        let message = text.slice(0, 300);
        try {
            const parsed = JSON.parse(text) as { error?: unknown };
            if (typeof parsed.error === 'string') message = parsed.error;
            else if (parsed.error && typeof parsed.error === 'object' && typeof (parsed.error as { message?: unknown }).message === 'string') message = (parsed.error as { message: string }).message;
        } catch {
            // plain-text error body
        }
        throw new RuntimeRequestError(`HTTP ${response.status}: ${message || response.statusText}`, response.status);
    }
    try {
        return (text ? JSON.parse(text) : {}) as T;
    } catch {
        throw new RuntimeRequestError('the answer was not JSON', response.status);
    }
}

/**
 * Streams newline-delimited JSON objects of a long runtime operation (a model download), without a timeout of its own.
 *
 * @private inference runtime http
 */
export async function runtimeStream(url: string, body: unknown, onObject: (value: Record<string, unknown>) => void, signal?: AbortSignal): Promise<void> {
    let response: Response;
    try {
        response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal, keepalive: false });
    } catch (error) {
        if (signal?.aborted) throw error;
        throw new RuntimeRequestError(`not reachable (${(error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message})`, 0);
    }
    if (!response.ok || !response.body) throw new RuntimeRequestError(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`, response.status);
    const decoder = new TextDecoder();
    let pending = '';
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        pending += decoder.decode(chunk, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.trim()) continue;
            let value: Record<string, unknown>;
            try {
                value = JSON.parse(line) as Record<string, unknown>;
            } catch {
                continue;
            }
            if (typeof value.error === 'string') throw new RuntimeRequestError(value.error, response.status);
            onObject(value);
        }
    }
    if (pending.trim()) {
        try {
            const value = JSON.parse(pending) as Record<string, unknown>;
            if (typeof value.error === 'string') throw new RuntimeRequestError(value.error, response.status);
            onObject(value);
        } catch (error) {
            if (error instanceof RuntimeRequestError) throw error;
        }
    }
}

/**
 * Whether a service URL is served on this host (loopback names and addresses, including the wildcard bind address).
 *
 * @private inference runtime http
 */
export function isLoopbackUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
        return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0' || host === '::' || /^127\./.test(host) || host === '::ffff:127.0.0.1';
    } catch {
        return false;
    }
}

/**
 * Stable identity of the actual service behind a URL: every loopback alias of one port is the same resource, so two
 * engines with differently spelled endpoints coordinate one service.
 *
 * @private inference runtime http
 */
export function serviceKey(variant: string, url: string): string {
    try {
        const parsed = new URL(url);
        const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
        const host = isLoopbackUrl(url) ? 'loopback' : parsed.hostname.toLowerCase();
        return `${variant}@${host}:${port}`;
    } catch {
        return `${variant}@${url}`;
    }
}

/**
 * Compares dotted numeric versions (`0.14.2` ≥ `0.14`); unknown parts compare as zero.
 *
 * @private inference runtime http
 */
export function versionAtLeast(version: string | undefined, minimum: string): boolean {
    if (!version) return false;
    const parts = (value: string): number[] => (/\d+(?:\.\d+)*/.exec(value)?.[0] ?? '0').split('.').map(Number);
    const have = parts(version);
    const want = parts(minimum);
    for (let index = 0; index < Math.max(have.length, want.length); index++) {
        const difference = (have[index] ?? 0) - (want[index] ?? 0);
        if (difference !== 0) return difference > 0;
    }
    return true;
}
