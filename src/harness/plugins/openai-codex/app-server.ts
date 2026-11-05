import { runProcess, type ProcessResult } from '../../../common/process.js';
import { parseJsonLine } from '../../shared.js';

/**
 * A JSON-RPC error answered by the Codex app server.
 *
 * @private Codex app-server connection
 */
export class AppServerError extends Error {
    public constructor(
        public readonly method: string,
        public readonly code: number | undefined,
        message: string,
    ) {
        super(message);
        this.name = 'AppServerError';
    }

    /** Whether the installed app server lacks this method entirely (an older release). */
    public get unknownMethod(): boolean {
        return this.code === -32601 || /unknown (variant|method)|method not found/i.test(this.message);
    }
}

/**
 * Options of an app-server connection.
 *
 * @private Codex app-server connection
 */
export type AppServerOptions = {
    /** Working directory. */
    readonly cwd: string;
    /** Environment of the selected instance (no API keys for a native instance). */
    readonly env: NodeJS.ProcessEnv;
    /** Configuration overrides (`-c key=value`). */
    readonly config?: readonly string[];
    /** Client name reported in `initialize`. */
    readonly client: string;
    /** Server notifications. */
    readonly onNotification?: (method: string, params: Record<string, unknown>) => void;
    /** stderr diagnostics (never credentials). */
    readonly onLog?: (line: string) => void;
};

/**
 * Default time limit of one request.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * One `codex app-server` process speaking JSON-RPC over stdio, opted into its experimental API. The process is an
 * ordinary owned child (reported to the engine) and ends with `close()` or the abort of its owner.
 *
 * @private Codex app-server connection
 */
export class AppServer {
    private readonly pending = new Map<number, { readonly method: string; readonly resolve: (value: unknown) => void; readonly reject: (error: Error) => void; readonly timer: NodeJS.Timeout }>();
    private nextId = 1;
    private controls?: { write: (text: string) => void; end: () => void };
    private readonly abort = new AbortController();
    /** The process outcome once it exited. */
    public readonly exited: Promise<ProcessResult>;
    /** Whether the process exited. */
    public closed = false;
    /** The `initialize` result. */
    public initialized: Record<string, unknown> = {};

    private constructor(private readonly options: AppServerOptions) {
        let ready: () => void = () => undefined;
        const attached = new Promise<void>((resolve) => (ready = resolve));
        this.exited = runProcess('codex', ['app-server', ...(options.config ?? []).flatMap((entry) => ['-c', entry])], {
            cwd: options.cwd,
            env: options.env,
            signal: this.abort.signal,
            maxOutputBytes: 64 * 1024,
            stdinController: (controls) => {
                this.controls = controls;
                ready();
            },
            onStdoutLine: (line) => this.receive(line),
            onStderrLine: (line) => options.onLog?.(line),
        }).then((result) => {
            this.closed = true;
            ready();
            for (const [id, entry] of this.pending) {
                clearTimeout(entry.timer);
                entry.reject(new AppServerError(entry.method, undefined, result.spawnError ?? `The Codex app server ended (${result.exitCode ?? result.signal ?? 'stopped'}).`));
                this.pending.delete(id);
            }
            return result;
        });
        this.attached = attached;
    }

    private readonly attached: Promise<void>;

    /**
     * Starts the app server and completes `initialize` with the experimental API (realtime) enabled.
     */
    public static async open(options: AppServerOptions): Promise<AppServer> {
        const server = new AppServer(options);
        await server.attached;
        if (server.closed) {
            const result = await server.exited;
            throw new AppServerError('initialize', undefined, result.spawnError ?? 'The Codex app server did not start.');
        }
        try {
            server.initialized = ((await server.request('initialize', { clientInfo: { name: options.client, version: '1' }, capabilities: { experimentalApi: true, requestAttestation: false } })) ?? {}) as Record<string, unknown>;
            server.notify('initialized');
        } catch (error) {
            server.close();
            throw error;
        }
        return server;
    }

    /** The installed version reported by the server (`<client>/<version> …`). */
    public get version(): string | undefined {
        return /\/(\d+\.\d+\.\d+[^\s(]*)/.exec(String(this.initialized.userAgent ?? ''))?.[1];
    }

    /** Sends a request and resolves with its result. */
    public async request(method: string, params: unknown = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
        if (this.closed || !this.controls) throw new AppServerError(method, undefined, 'The Codex app server is not running.');
        const id = this.nextId++;
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new AppServerError(method, undefined, `The Codex app server did not answer ${method} in time.`));
            }, timeoutMs);
            timer.unref();
            this.pending.set(id, { method, resolve, reject, timer });
            this.controls!.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
        });
    }

    /** Sends a notification. */
    public notify(method: string, params?: unknown): void {
        if (this.closed || !this.controls) return;
        this.controls.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) })}\n`);
    }

    /** Ends stdin and stops the process (forcibly when it does not exit in time). Idempotent. */
    public close(): void {
        if (this.closed) return;
        this.controls?.end();
        const timer = setTimeout(() => this.abort.abort(), 1_500);
        timer.unref();
        void this.exited.then(() => clearTimeout(timer));
    }

    /** Handles one output line: a response or a notification. */
    private receive(line: string): void {
        const message = parseJsonLine(line);
        if (!message) return;
        if (typeof message.id === 'number' && ('result' in message || 'error' in message)) {
            const entry = this.pending.get(message.id);
            if (!entry) return;
            this.pending.delete(message.id);
            clearTimeout(entry.timer);
            const error = message.error as { code?: number; message?: string } | undefined;
            if (error) entry.reject(new AppServerError(entry.method, error.code, error.message ?? 'Request failed.'));
            else entry.resolve(message.result);
            return;
        }
        if (typeof message.method === 'string') {
            // A server request needing an answer (approval) is declined: voice never grants approvals invisibly.
            if (message.id !== undefined) this.controls?.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Not supported by ptbk voice.' } })}\n`);
            else this.options.onNotification?.(message.method, (message.params ?? {}) as Record<string, unknown>);
        }
    }
}
