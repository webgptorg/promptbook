import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { delimiter, extname, isAbsolute, join, resolve } from 'node:path';

/**
 * Default ceiling for captured output per stream (bytes).
 */
const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

/**
 * Grace period between a polite termination signal and a forced kill.
 */
const KILL_GRACE_MS = 5000;

/**
 * Returns the executable search directories of an environment.
 *
 * @private shared process helper
 */
export function searchPath(env: NodeJS.ProcessEnv = process.env): string[] {
    const value = env.PATH ?? env.Path ?? env.path ?? '';
    return value.split(delimiter).filter(Boolean);
}

/**
 * Checks whether a file exists and is executable (on Windows: exists).
 */
async function isExecutableFile(path: string): Promise<boolean> {
    try {
        const info = await stat(path);
        if (!info.isFile()) return false;
        if (process.platform === 'win32') return true;
        await access(path, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Resolves a command name to an absolute executable path using `PATH` (and `PATHEXT` on Windows).
 *
 * @private shared process helper
 */
export async function which(command: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const extensions =
        process.platform === 'win32'
            ? ['', ...(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((extension) => extension.toLowerCase())]
            : [''];
    const candidates = isAbsolute(command) || command.includes('/') || command.includes('\\') ? [resolve(command)] : searchPath(env).map((directory) => join(directory, command));
    for (const candidate of candidates) {
        for (const extension of extensions) {
            if (process.platform === 'win32' && extension === '' && !extname(candidate)) continue;
            const path = candidate + extension;
            if (await isExecutableFile(path)) return path;
        }
    }
    return undefined;
}

/**
 * Escapes one argument for `cmd.exe` (cross-spawn compatible).
 */
function escapeCmdArgument(argument: string, doubleEscape: boolean): string {
    let escaped = argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1');
    escaped = `"${escaped}"`;
    escaped = escaped.replace(/([()\][%!^"`<>&|;, *?])/g, '^$1');
    if (doubleEscape) escaped = escaped.replace(/([()\][%!^"`<>&|;, *?])/g, '^$1');
    return escaped;
}

/**
 * Builds the actual spawn invocation, wrapping Windows batch shims with `cmd.exe`.
 *
 * @private shared process helper
 */
export async function resolveInvocation(
    command: string,
    args: readonly string[],
    env: NodeJS.ProcessEnv = process.env,
): Promise<{ file: string; args: string[]; windowsVerbatimArguments: boolean } | undefined> {
    const file = await which(command, env);
    if (!file) return undefined;
    if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(file)) {
        const doubleEscape = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(file);
        const line = [escapeCmdArgument(file, false), ...args.map((argument) => escapeCmdArgument(argument, doubleEscape))].join(' ');
        return { file: env.ComSpec || env.COMSPEC || 'cmd.exe', args: ['/d', '/s', '/c', `"${line}"`], windowsVerbatimArguments: true };
    }
    return { file, args: [...args], windowsVerbatimArguments: false };
}

/**
 * Options of a bounded subprocess run.
 *
 * @private shared process helper
 */
export type RunProcessOptions = {
    /** Working directory. */
    readonly cwd: string;
    /** Environment (defaults to the current process environment). */
    readonly env?: NodeJS.ProcessEnv;
    /** Text written to stdin (stdin is closed afterwards). */
    readonly input?: string;
    /** Hard timeout; the process tree is terminated when exceeded. */
    readonly timeoutMs?: number;
    /** Cancellation signal; the process tree is terminated when aborted. */
    readonly signal?: AbortSignal;
    /** Called for every complete stdout line. */
    readonly onStdoutLine?: (line: string) => void;
    /** Called for every complete stderr line. */
    readonly onStderrLine?: (line: string) => void;
    /** Maximal captured bytes per stream; older output is dropped and truncation is reported. */
    readonly maxOutputBytes?: number;
    /** Inherit the terminal instead of capturing (interactive native login flows). */
    readonly inheritStdio?: boolean;
    /** Keeps the terminal's input attached and relays every output chunk live, while still capturing it (attended flows). */
    readonly relayOutput?: (chunk: string) => void;
    /** Keeps stdin open for a request/response protocol; the controller writes and ends it. */
    readonly stdinController?: (controls: { write: (text: string) => void; end: () => void }) => void;
    /** Terminates a process that produced no output for this long (unattended stall detection). */
    readonly stallTimeoutMs?: number;
    /** Output tail that looks like a question to a terminal; such a silent process is stopped much sooner. */
    readonly inputPromptPattern?: RegExp;
};

/**
 * Silence after a prompt-looking output tail that classifies a process as waiting for hidden input.
 */
const INPUT_WAIT_MS = 2 * 60_000;

/**
 * Observed outcome of a subprocess.
 *
 * @private shared process helper
 */
export type ProcessResult = {
    /** Exit code, `null` when terminated by a signal or never started. */
    readonly exitCode: number | null;
    /** Terminating signal, if any. */
    readonly signal: NodeJS.Signals | null;
    /** The process was stopped as stalled: silent too long, or silently waiting for terminal input. */
    readonly stalled?: 'no-output' | 'input-prompt';
    /** Captured stdout (possibly truncated at the start). */
    readonly stdout: string;
    /** Captured stderr (possibly truncated at the start). */
    readonly stderr: string;
    /** Whether captured output was truncated. */
    readonly truncated: boolean;
    /** The timeout elapsed. */
    readonly timedOut: boolean;
    /** The run was cancelled by its signal. */
    readonly cancelled: boolean;
    /** The executable could not be started (missing, permissions, ...). */
    readonly spawnError?: string;
    /** Wall-clock duration. */
    readonly durationMs: number;
};

/**
 * Bounded text accumulator keeping the newest output.
 */
class OutputBuffer {
    private chunks: string[] = [];
    private size = 0;
    public truncated = false;
    private partial = '';

    public constructor(
        private readonly limit: number,
        private readonly onLine?: (line: string) => void,
    ) {}

    /** Appends a decoded chunk. */
    public push(text: string): void {
        this.chunks.push(text);
        this.size += text.length;
        while (this.size > this.limit && this.chunks.length > 1) {
            this.size -= this.chunks.shift()!.length;
            this.truncated = true;
        }
        if (this.size > this.limit && this.chunks.length === 1) {
            this.chunks[0] = this.chunks[0]!.slice(this.size - this.limit);
            this.size = this.limit;
            this.truncated = true;
        }
        if (this.onLine) {
            const lines = (this.partial + text).split('\n');
            this.partial = lines.pop() ?? '';
            for (const line of lines) this.onLine(line.replace(/\r$/, ''));
        }
    }

    /** Flushes a trailing partial line. */
    public end(): void {
        if (this.onLine && this.partial) this.onLine(this.partial.replace(/\r$/, ''));
        this.partial = '';
    }

    /** Captured text. */
    public text(): string {
        return this.chunks.join('');
    }
}

/**
 * Receives every child process started through the shared helpers, so the engine can record it as owned execution.
 *
 * @private shared process helper
 */
export type SpawnObserver = (child: ChildProcess, info: { readonly group: boolean; readonly label: string }) => void;

/**
 * The installed observer (only an engine host installs one).
 */
let spawnObserver: SpawnObserver | undefined;

/**
 * Installs (or removes) the observer of spawned child processes.
 *
 * @private shared process helper
 */
export function observeSpawnedProcesses(observer: SpawnObserver | undefined): void {
    spawnObserver = observer;
}

/**
 * Reports a spawned child (`group`: it leads its own process group, so terminating the group reaches its descendants).
 * An observer failure never affects the spawn.
 *
 * @private shared process helper
 */
export function reportSpawnedProcess(child: ChildProcess, info: { readonly group: boolean; readonly label: string }): void {
    if (child.pid === undefined) return;
    try {
        spawnObserver?.(child, info);
    } catch {
        // Recording owned processes is best-effort.
    }
}

/**
 * When a process started (epoch ms), from the operating system; undefined when it is gone or the time is unavailable.
 * It identifies a PID across reuse: a reused PID belongs to a process started after the original was recorded.
 *
 * @private shared process helper
 */
export async function processStartedAt(pid: number): Promise<number | undefined> {
    if (!isProcessAlive(pid)) return undefined;
    if (process.platform === 'win32') {
        const result = await runProcess('powershell', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid}).StartTime.ToUniversalTime().ToString('o')`], { cwd: process.cwd(), timeoutMs: 15_000 });
        const time = Date.parse(result.stdout.trim());
        return result.exitCode === 0 && Number.isFinite(time) ? time : undefined;
    }
    if (process.platform === 'linux') {
        // /proc works without `ps` (minimal containers): start ticks after boot plus the boot time.
        try {
            const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
            const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
            const ticks = Number(fields[19]);
            const boot = Number(/^btime (\d+)$/m.exec(await readFile('/proc/stat', 'utf8'))?.[1]);
            if (Number.isFinite(ticks) && Number.isFinite(boot)) return boot * 1000 + (ticks / 100) * 1000;
        } catch {
            // fall back to ps
        }
    }
    const result = await runProcess('ps', ['-o', 'lstart=', '-p', String(pid)], { cwd: process.cwd(), env: { ...process.env, LC_ALL: 'C', LANG: 'C' }, timeoutMs: 10_000 });
    const time = Date.parse(result.stdout.trim().replace(/\s+/g, ' '));
    return result.exitCode === 0 && Number.isFinite(time) ? time : undefined;
}

/**
 * Tolerance between a process's OS start time (whole seconds on some systems) and the time it was recorded.
 */
const START_TIME_TOLERANCE_MS = 2000;

/**
 * Verifies that a live PID is still the process recorded at `recordedAt` (it started no later than that), so a stale
 * record or a reused PID never authorizes terminating an unrelated process.
 *
 * @private shared process helper
 */
export async function verifyRecordedProcess(pid: number, recordedAt: string): Promise<'verified' | 'gone' | 'reused' | 'unknown'> {
    if (!isProcessAlive(pid)) return 'gone';
    const started = await processStartedAt(pid);
    if (started === undefined) return isProcessAlive(pid) ? 'unknown' : 'gone';
    return started <= Date.parse(recordedAt) + START_TIME_TOLERANCE_MS ? 'verified' : 'reused';
}

/**
 * Immediately kills a verified process by PID: with `group` its whole process group (POSIX), on Windows its tree.
 * Only call it for a process whose identity was verified; nothing is matched by name.
 *
 * @private shared process helper
 */
export async function killVerifiedProcess(pid: number, options: { readonly group?: boolean } = {}): Promise<void> {
    if (process.platform === 'win32') {
        await runProcess('taskkill', ['/pid', String(pid), '/T', '/F'], { cwd: process.cwd(), timeoutMs: 15_000 });
        return;
    }
    if (options.group) {
        try {
            process.kill(-pid, 'SIGKILL');
            return;
        } catch {
            // not a group leader (any more): the process itself
        }
    }
    try {
        process.kill(pid, 'SIGKILL');
    } catch {
        // already gone
    }
}

/**
 * Whether a POSIX process group still has members (its leader may have exited). While a group exists, its ID cannot be
 * reused by a new process, so remaining members are still the recorded group's descendants.
 *
 * @private shared process helper
 */
export function processGroupAlive(pgid: number): boolean {
    if (process.platform === 'win32' || !Number.isInteger(pgid) || pgid <= 0) return false;
    try {
        process.kill(-pgid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/**
 * Terminates a child and, where possible, its whole process tree.
 *
 * @private shared process helper
 */
export function terminateProcessTree(child: ChildProcess, force = false): void {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32') {
        // Kill exactly this child's tree by PID; never by image name.
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', ...(force ? ['/F'] : [])], { stdio: 'ignore', windowsHide: true });
        killer.on('error', () => child.kill());
        return;
    }
    try {
        process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM');
    } catch {
        child.kill(force ? 'SIGKILL' : 'SIGTERM');
    }
}

/**
 * Runs a command without a shell (Windows batch shims are wrapped safely), capturing bounded output.
 *
 * @private shared process helper
 */
export async function runProcess(command: string, args: readonly string[], options: RunProcessOptions): Promise<ProcessResult> {
    const started = Date.now();
    const env = options.env ?? process.env;
    const invocation = await resolveInvocation(command, args, env);
    if (!invocation) {
        return {
            exitCode: null,
            signal: null,
            stdout: '',
            stderr: '',
            truncated: false,
            timedOut: false,
            cancelled: false,
            spawnError: `\`${command}\` was not found on PATH.`,
            durationMs: 0,
        };
    }
    const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env,
        stdio: options.inheritStdio ? 'inherit' : options.relayOutput ? ['inherit', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        windowsVerbatimArguments: invocation.windowsVerbatimArguments,
        // Attended flows stay in the terminal's foreground process group (they read it and receive its Ctrl+C).
        detached: process.platform !== 'win32' && !options.inheritStdio && !options.relayOutput,
    };
    return await new Promise<ProcessResult>((resolvePromise) => {
        const limit = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
        let lastOutputAt = Date.now();
        let lastLine = '';
        const observe =
            (callback?: (line: string) => void) =>
            (line: string): void => {
                if (line.trim()) lastLine = line;
                callback?.(line);
            };
        const stdout = new OutputBuffer(limit, observe(options.onStdoutLine));
        const stderr = new OutputBuffer(limit, observe(options.onStderrLine));
        let stalled: ProcessResult['stalled'];
        let timedOut = false;
        let cancelled = false;
        let settled = false;
        let child: ChildProcess;
        try {
            child = spawn(invocation.file, invocation.args, spawnOptions);
            reportSpawnedProcess(child, { group: spawnOptions.detached === true, label: command });
        } catch (error) {
            resolvePromise({
                exitCode: null,
                signal: null,
                stdout: '',
                stderr: '',
                truncated: false,
                timedOut: false,
                cancelled: false,
                spawnError: (error as Error).message,
                durationMs: Date.now() - started,
            });
            return;
        }
        const timers: NodeJS.Timeout[] = [];
        const stop = (): void => {
            terminateProcessTree(child);
            const forced = setTimeout(() => terminateProcessTree(child, true), KILL_GRACE_MS);
            forced.unref();
            timers.push(forced);
        };
        if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
            const timer = setTimeout(() => {
                timedOut = true;
                stop();
            }, options.timeoutMs);
            timer.unref();
            timers.push(timer);
        }
        const onAbort = (): void => {
            cancelled = true;
            stop();
        };
        if (options.signal) {
            if (options.signal.aborted) onAbort();
            else options.signal.addEventListener('abort', onAbort, { once: true });
        }
        if ((options.stallTimeoutMs ?? 0) > 0 || options.inputPromptPattern) {
            const watchdog = setInterval(
                () => {
                    const silence = Date.now() - lastOutputAt;
                    if (options.inputPromptPattern && silence >= INPUT_WAIT_MS && options.inputPromptPattern.test(lastLine)) stalled = 'input-prompt';
                    else if ((options.stallTimeoutMs ?? 0) > 0 && silence >= options.stallTimeoutMs!) stalled = 'no-output';
                    if (stalled) {
                        clearInterval(watchdog);
                        stop();
                    }
                },
                Math.min(15_000, Math.max(250, Math.floor((options.stallTimeoutMs || INPUT_WAIT_MS) / 4))),
            );
            watchdog.unref();
            timers.push(watchdog);
        }
        child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
            lastOutputAt = Date.now();
            options.relayOutput?.(chunk);
            stdout.push(chunk);
            const tail = chunk.split(/\r?\n/).pop();
            if (tail?.trim()) lastLine = tail;
        });
        child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
            lastOutputAt = Date.now();
            options.relayOutput?.(chunk);
            stderr.push(chunk);
            const tail = chunk.split(/\r?\n/).pop();
            if (tail?.trim()) lastLine = tail;
        });
        child.stdin?.on('error', () => undefined);
        if (child.stdin) {
            const stdin = child.stdin;
            if (options.stdinController) {
                options.stdinController({
                    write: (text: string) => {
                        if (!stdin.destroyed && stdin.writable) stdin.write(text);
                    },
                    end: () => {
                        if (!stdin.destroyed) stdin.end();
                    },
                });
            } else if (options.input !== undefined) stdin.end(options.input);
            else stdin.end();
        }
        const finish = (exitCode: number | null, signal: NodeJS.Signals | null, spawnError?: string): void => {
            if (settled) return;
            settled = true;
            for (const timer of timers) clearTimeout(timer);
            for (const timer of timers) clearInterval(timer);
            options.signal?.removeEventListener('abort', onAbort);
            stdout.end();
            stderr.end();
            resolvePromise({
                exitCode,
                signal,
                stdout: stdout.text(),
                stderr: stderr.text(),
                truncated: stdout.truncated || stderr.truncated,
                timedOut,
                cancelled,
                stalled,
                spawnError,
                durationMs: Date.now() - started,
            });
        };
        child.on('error', (error) => finish(null, null, error.message));
        child.on('close', (code, signal) => finish(code, signal));
    });
}

/**
 * Checks whether a process with this PID currently exists.
 *
 * @private shared process helper
 */
export function isProcessAlive(pid: number | undefined): boolean {
    if (!pid || !Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}
