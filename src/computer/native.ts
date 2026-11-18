import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Physical primary-display coordinate space; topology changes invalidate earlier coordinates. @private computer control */
export type ComputerScreen = {
    readonly width: number;
    readonly height: number;
    readonly scaleFactor: number;
    readonly topology: string;
};

/** Truthful native capability and human-control state, independent of the Console frontend. @private computer control */
export type ComputerBackendStatus = {
    readonly platform: NodeJS.Platform;
    readonly supported: boolean;
    readonly available: boolean;
    readonly reason?: string;
    readonly accessibility: boolean;
    readonly screenRecording: boolean;
    readonly cursor: 'shared';
    readonly primaryScreen?: ComputerScreen;
    /** Opaque foreground app/window identity, used to invalidate coordinates after focus changes. */
    readonly context?: string;
    readonly lastHumanInputAt: number;
    readonly isPaused: boolean;
    readonly isStopped: boolean;
};

/** Engine attribution rendered by the native always-on-top control bar. @private computer control */
export type ComputerIndicator = {
    readonly project: string;
    readonly agent: string;
    readonly state: 'active' | 'human-paused' | 'paused' | 'stopped' | 'idle' | 'disabled';
};

/** Native desktop primitives. All coordinates refer to the last observed primary-display topology. @private computer control */
export type ComputerCommand = { readonly context?: string } & (
    | { readonly op: 'screenshot' }
    | { readonly op: 'move'; readonly x: number; readonly y: number; readonly durationMs?: number }
    | { readonly op: 'click'; readonly x?: number; readonly y?: number; readonly button?: 'left' | 'right' | 'middle'; readonly count?: number }
    | { readonly op: 'button'; readonly button: 'left' | 'right' | 'middle'; readonly isDown: boolean }
    | { readonly op: 'drag'; readonly x: number; readonly y: number; readonly durationMs?: number }
    | { readonly op: 'scroll'; readonly deltaX?: number; readonly deltaY?: number }
    | { readonly op: 'key'; readonly keys: readonly string[] }
    | { readonly op: 'type'; readonly text: string }
    | { readonly op: 'clipboardRead' }
    | { readonly op: 'clipboardWrite'; readonly text: string }
    | { readonly op: 'accessibility' });

/** Native control notifications never contain captured pixels, typed text or clipboard contents. @private computer control */
export type ComputerBackendEvent = {
    readonly event: 'human-input' | 'pause' | 'resume' | 'stop' | 'unavailable';
    readonly at: number;
    readonly reason?: string;
};

/** Native helper boundary, injectable for meaningful coordinator tests without touching the user's desktop. @private computer control */
export interface ComputerBackend {
    status(): Promise<ComputerBackendStatus>;
    requestPermissions(): Promise<ComputerBackendStatus>;
    execute(command: ComputerCommand, signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>>;
    setIndicator(indicator: ComputerIndicator): Promise<void>;
    releaseInputs(): Promise<void>;
    pause?(): Promise<void>;
    stop?(): Promise<void>;
    resume(): Promise<void>;
    close(): Promise<void>;
    onEvent(listener: (event: ComputerBackendEvent) => void): () => void;
}

/** One pending native request; command bodies are deliberately never retained in errors or logs. */
type PendingRequest = {
    readonly resolve: (value: Readonly<Record<string, unknown>>) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
};

/** Native helper request limit (permission dialogs may stay open while the user reads them). */
const NATIVE_TIMEOUT_MS = 120_000;

/** Largest permitted image response; bounds malformed or compromised native output. */
const MAX_NATIVE_LINE_BYTES = 40 * 1024 * 1024;

/** Directory shipped alongside the compiled Node adapter in every npm installation. */
const NATIVE_SOURCE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'native');

/** Native helper launch process, kept separate from Electron and the viewed project. @private computer control */
export class NativeComputerBackend implements ComputerBackend {
    private child: ChildProcessWithoutNullStreams | undefined;
    private starting: Promise<void> | undefined;
    private readonly pending = new Map<number, PendingRequest>();
    private readonly listeners = new Set<(event: ComputerBackendEvent) => void>();
    private sequence = 0;
    private buffer = '';
    private closed = false;
    private armed = false;
    private failure: string | undefined;

    /** Subscribe to human priority, explicit native controls and helper loss. */
    public onEvent(listener: (event: ComputerBackendEvent) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** Query the actual host; unsupported hosts never silently fall back to shell automation. */
    public async status(): Promise<ComputerBackendStatus> {
        const unsupported = this.unsupportedReason();
        if (unsupported) return this.unavailable(unsupported, false);
        if (this.closed) return this.unavailable('Computer Control is closed.', true);
        try {
            const result = await this.request({ op: 'status' });
            return this.normalizeStatus(result);
        } catch (error) {
            return this.unavailable(error instanceof Error ? error.message : 'Native helper unavailable.', true);
        }
    }

    /** Invoke native OS permission UI only through this deliberate request. */
    public async requestPermissions(): Promise<ComputerBackendStatus> {
        if (this.unsupportedReason()) return this.status();
        try {
            return this.normalizeStatus(await this.request({ op: 'permissions' }));
        } catch (error) {
            return this.unavailable(error instanceof Error ? error.message : 'Native permissions unavailable.', true);
        }
    }

    /** Perform one primitive; the helper independently enforces human priority and indicator presence. */
    public async execute(command: ComputerCommand, signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>> {
        if (signal?.aborted) throw new Error('Computer Control was interrupted.');
        if (!this.armed) throw new Error('Computer Control requires a visible attributed control indicator.');
        const interrupt = (): void => { void this.releaseInputs().catch(() => undefined); };
        signal?.addEventListener('abort', interrupt, { once: true });
        try {
            const result = await this.request(command, NATIVE_TIMEOUT_MS, signal);
            if (signal?.aborted) throw new Error('Computer Control was interrupted; any partial effect must be reconciled.');
            return result;
        } finally {
            signal?.removeEventListener('abort', interrupt);
        }
    }

    /** Acknowledge native bar creation before exposing the desktop to an agent. */
    public async setIndicator(indicator: ComputerIndicator): Promise<void> {
        this.armed = false;
        await this.request({ op: 'indicator', ...indicator });
        this.armed = indicator.state === 'active' || indicator.state === 'human-paused';
    }

    /** Cancel in-flight input and release only the helper's held keys and buttons. */
    public async releaseInputs(): Promise<void> {
        if (!this.child) return;
        await this.request({ op: 'releaseInputs' });
    }

    /** Clear a manual native takeover only after an explicit user handoff. */
    public async resume(): Promise<void> {
        await this.request({ op: 'resume' });
    }

    /** Pause inputs and observation through the native priority control path. */
    public async pause(): Promise<void> {
        this.armed = false;
        if (this.child) await this.request({ op: 'pause' });
    }

    /** Latch the native emergency stop independently of the engine presentation. */
    public async stop(): Promise<void> {
        this.armed = false;
        if (this.child) await this.request({ op: 'stop' });
    }

    /** Stop the helper; EOF and native watchdogs provide independent held-input cleanup. */
    public async close(): Promise<void> {
        if (this.closed) return;
        this.armed = false;
        if (this.child) {
            await this.request({ op: 'close' }, 3_000).catch(() => undefined);
            this.child?.kill();
        }
        this.closed = true;
        this.failPending(new Error('Computer Control helper closed.'));
    }

    /** Explain immutable platform restrictions before launching any native process. */
    private unsupportedReason(): string | undefined {
        if (process.platform === 'darwin') {
            if (process.arch !== 'arm64') return 'Computer Control requires the native arm64 engine on an Apple Silicon Mac.';
            if (Number.parseInt(release(), 10) < 23) return 'Computer Control requires macOS 14 or later.';
            return undefined;
        }
        if (process.platform === 'win32') return undefined;
        return 'Computer Control requires an interactive Windows 10/11 or Apple Silicon macOS 14+ desktop; this host is unsupported.';
    }

    /** Build a stable diagnostic without exposing command arguments or native stderr. */
    private unavailable(reason: string, supported: boolean): ComputerBackendStatus {
        return { platform: process.platform, supported, available: false, reason, accessibility: false, screenRecording: false, cursor: 'shared', lastHumanInputAt: 0, isPaused: true, isStopped: false };
    }

    /** Reject malformed native status rather than advertising speculative capabilities. */
    private normalizeStatus(result: Readonly<Record<string, unknown>>): ComputerBackendStatus {
        const screen = result.primaryScreen as Partial<ComputerScreen> | undefined;
        const primaryScreen = screen && Number.isFinite(screen.width) && Number.isFinite(screen.height) && Number(screen.width) > 0 && Number(screen.height) > 0 && typeof screen.topology === 'string'
            ? { width: Number(screen.width), height: Number(screen.height), scaleFactor: typeof screen.scaleFactor === 'number' ? screen.scaleFactor : 1, topology: screen.topology }
            : undefined;
        return {
            platform: process.platform,
            supported: true,
            available: result.available === true && Boolean(primaryScreen),
            reason: typeof result.reason === 'string' ? result.reason : undefined,
            accessibility: result.accessibility === true,
            screenRecording: result.screenRecording === true,
            cursor: 'shared',
            primaryScreen,
            context: typeof result.context === 'string' ? result.context : undefined,
            lastHumanInputAt: typeof result.lastHumanInputAt === 'number' ? result.lastHumanInputAt : 0,
            isPaused: result.isPaused !== false,
            isStopped: result.isStopped === true,
        };
    }

    /** Dispatch a bounded request to the helper without logging its possibly sensitive parameters. */
    private async request(command: Readonly<Record<string, unknown>>, timeout = NATIVE_TIMEOUT_MS, signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>> {
        if (this.closed) throw new Error('Computer Control is closed.');
        const reason = this.unsupportedReason();
        if (reason) throw new Error(reason);
        await this.start();
        if (signal?.aborted) throw new Error('Computer Control was interrupted before input.');
        const child = this.child;
        if (!child?.stdin.writable) throw new Error(this.failure ?? 'Computer Control native helper is unavailable.');
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.armed = false;
                this.failure = 'Computer Control helper timed out; pending effects must be checked before retry.';
                // A timed-out helper must not continue input unseen.
                child.kill();
                reject(new Error(this.failure));
            }, timeout);
            this.pending.set(id, { resolve, reject, timer });
            child.stdin.write(`${JSON.stringify({ id, ...command })}\n`, (error) => {
                if (!error) return;
                const pending = this.pending.get(id);
                if (!pending) return;
                clearTimeout(pending.timer);
                this.pending.delete(id);
                reject(new Error('Computer Control helper input channel closed.'));
            });
        });
    }

    /** Serialize native startup; the root coordinator serializes host ownership across projects. */
    private async start(): Promise<void> {
        if (this.child) return;
        if (this.starting) return this.starting;
        this.starting = this.launch();
        try { await this.starting; } finally { this.starting = undefined; }
    }

    /** Launch only bundled local code, never interpolate agent arguments into a shell. */
    private async launch(): Promise<void> {
        let executable: string;
        let args: string[];
        if (process.platform === 'darwin') {
            executable = await this.macExecutable();
            args = [];
        } else {
            executable = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
            args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', join(NATIVE_SOURCE_DIRECTORY, 'windows.ps1')];
        }
        if (this.closed) throw new Error('Computer Control closed during startup.');
        const child = spawn(executable, args, { stdio: 'pipe', windowsHide: true, shell: false });
        this.child = child;
        this.buffer = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => this.receive(chunk));
        // Native diagnostics may inadvertently contain application/permission metadata. Never forward stderr to traces.
        child.stderr.resume();
        child.on('error', () => this.lost(child, 'The native Computer Control helper could not start.'));
        child.on('exit', () => this.lost(child, 'The native Computer Control helper exited; desktop control is stopped.'));
        await new Promise<void>((resolve, reject) => {
            child.once('spawn', resolve);
            child.once('error', () => reject(new Error('The native Computer Control helper could not start.')));
        });
    }

    /** Compile the bundled Swift helper locally into a stable per-user path, without capturing screen data. */
    private async macExecutable(): Promise<string> {
        const source = join(NATIVE_SOURCE_DIRECTORY, 'macos.swift');
        const content = await readFile(source);
        const hash = createHash('sha256').update(content).digest('hex');
        const directory = join(homedir(), 'Library', 'Application Support', 'Promptbook', 'computer-control');
        const target = join(directory, 'ptbk-computer-control');
        const stamp = join(directory, 'source.sha256');
        if ((await readFile(stamp, 'utf8').catch(() => '')) === hash && (await stat(target).catch(() => undefined))?.isFile()) return target;
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = `${target}.${process.pid}.tmp`;
        try {
            const bundled = join(NATIVE_SOURCE_DIRECTORY, 'macos-arm64', 'ptbk-computer-control');
            const bundledStamp = await readFile(join(NATIVE_SOURCE_DIRECTORY, 'macos-arm64', 'source.sha256'), 'utf8').catch(() => '');
            if (bundledStamp.trim() === hash && (await stat(bundled).catch(() => undefined))?.isFile()) {
                await copyFile(bundled, temporary);
                await chmod(temporary, 0o700);
                await rename(temporary, target);
                await writeFile(stamp, hash, { mode: 0o600 });
                return target;
            }
            await new Promise<void>((resolve, reject) => {
                const child = spawn('/usr/bin/xcrun', ['swiftc', '-O', '-swift-version', '5', '-strict-concurrency=minimal', '-target', 'arm64-apple-macos14.0', source, '-o', temporary], { stdio: ['ignore', 'ignore', 'pipe'], shell: false });
                child.stderr.resume();
                const timer = setTimeout(() => { child.kill(); reject(new Error('The native desktop helper compilation timed out.')); }, NATIVE_TIMEOUT_MS);
                child.once('error', () => { clearTimeout(timer); reject(new Error('Computer Control requires the Apple Command Line Tools to build its bundled native helper.')); });
                child.once('exit', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('The native desktop helper could not compile. Check Apple Command Line Tools and this engine installation.')); });
            });
            await rename(temporary, target);
            await writeFile(stamp, hash, { mode: 0o600 });
            return target;
        } finally { await rm(temporary, { force: true }); }
    }

    /** Parse newline-delimited native replies and non-sensitive control events. */
    private receive(chunk: string): void {
        this.buffer += chunk;
        if (Buffer.byteLength(this.buffer, 'utf8') > MAX_NATIVE_LINE_BYTES) {
            this.child?.kill();
            return;
        }
        let end: number;
        while ((end = this.buffer.indexOf('\n')) >= 0) {
            const line = this.buffer.slice(0, end).trim();
            this.buffer = this.buffer.slice(end + 1);
            if (!line) continue;
            let response: Record<string, unknown>;
            try { response = JSON.parse(line) as Record<string, unknown>; } catch { this.child?.kill(); return; }
            if (typeof response.event === 'string') {
                if (['human-input', 'pause', 'resume', 'stop', 'unavailable'].includes(response.event)) {
                    if (['pause', 'stop', 'unavailable'].includes(response.event)) this.armed = false;
                    const event: ComputerBackendEvent = { event: response.event as ComputerBackendEvent['event'], at: typeof response.at === 'number' ? response.at : Date.now(), reason: typeof response.reason === 'string' ? response.reason : undefined };
                    for (const listener of this.listeners) { try { listener(event); } catch { /* observers cannot disable native input safety */ } }
                }
                continue;
            }
            if (typeof response.id !== 'number') continue;
            const pending = this.pending.get(response.id);
            if (!pending) continue;
            clearTimeout(pending.timer);
            this.pending.delete(response.id);
            if (typeof response.error === 'string') pending.reject(new Error(response.error));
            else if (response.result && typeof response.result === 'object' && !Array.isArray(response.result)) pending.resolve(response.result as Record<string, unknown>);
            else pending.reject(new Error('Malformed native Computer Control response.'));
        }
    }

    /** Fail closed on process loss, making the coordinator re-observe before any future input. */
    private lost(child: ChildProcessWithoutNullStreams, reason: string): void {
        if (this.child !== child) return;
        this.child = undefined;
        this.armed = false;
        this.buffer = '';
        this.failure = reason;
        this.failPending(new Error(reason));
        if (!this.closed) for (const listener of this.listeners) {
            try { listener({ event: 'unavailable', at: Date.now(), reason }); } catch { /* independent listeners */ }
        }
    }

    /** Reject every pending request after native process loss. */
    private failPending(error: Error): void {
        for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(error); }
        this.pending.clear();
    }
}
