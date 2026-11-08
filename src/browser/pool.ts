import { spawn } from 'node:child_process';
import { readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { isProcessAlive, killVerifiedProcess, verifyRecordedProcess } from '../common/process.js';
import { redact } from '../common/redact.js';

/**
 * One engine connected to a shared browser process.
 *
 * @private browser pools
 */
export type PoolConnection = {
    /** Engine instance. */
    readonly instanceId: string;
    /** Project directory of that engine. */
    readonly project: string;
    /** Engine process (a dead one's connection is dropped). */
    readonly pid: number;
    readonly since: string;
};

/**
 * The shared browser process of one actual profile and the engines connected to it (`<app data>/browser-pools/`).
 * There is no master engine: whoever connects first launches it, every engine is an equal member, and the last
 * managed disconnection closes it (its profile data stays).
 *
 * @private browser pools
 */
export type PoolRecord = {
    readonly version: 1;
    /** Actual profile directory (the pool's identity). */
    readonly profile: string;
    readonly executable: string;
    /** The browser process (verified by its start time before any termination). */
    readonly pid: number;
    /** When the process was launched (ISO). */
    readonly launchedAt: string;
    /** Local DevTools port and WebSocket endpoint. */
    readonly port: number;
    readonly webSocket: string;
    /** The mode the running process actually has (a changed saved mode never silently restarts other users). */
    readonly headless: boolean;
    /** Arguments the process was launched with (a restart reuses them). */
    readonly args: readonly string[];
    readonly connections: Readonly<Record<string, PoolConnection>>;
};

/**
 * Total startup/recovery budget, including a slow native browser's first launch.
 *
 * @private browser startup
 */
export const BROWSER_STARTUP_TIMEOUT_MS = 90_000;

/**
 * Longest wait for the pool's lock (another engine launching or closing the same profile).
 */
const LOCK_TIMEOUT_MS = BROWSER_STARTUP_TIMEOUT_MS + 15_000;

/**
 * A lock older than this is stale (its holder died while holding it).
 */
const LOCK_STALE_MS = 120_000;

/**
 * Grace for a graceful browser close before the verified process is killed.
 */
const CLOSE_GRACE_MS = 5_000;

/**
 * Engine-wide coordination of shared browser processes per actual profile: launch on the first connection, join on
 * later ones, close after the last managed disconnection. All mutations of one profile's pool happen under its lock,
 * so simultaneous starts never launch duplicate browsers or corrupt a profile. A browser this coordination did not
 * launch (the user's own) is never seized or terminated.
 *
 * @private browser pools
 */
export class BrowserPools {
    public constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

    /** Directory of the pool records. */
    private get directory(): string {
        return join(promptbookAppData(this.env), 'browser-pools');
    }

    /** Record file of a profile's pool. */
    private file(profile: string): string {
        return join(this.directory, `${shortHash(profile, 16)}.json`);
    }

    /** Runs an action under the profile pool's lock. */
    private async locked<T>(profile: string, action: () => Promise<T>): Promise<T> {
        await ensureDirectory(this.directory);
        const lock = `${this.file(profile)}.lock`;
        const deadline = Date.now() + LOCK_TIMEOUT_MS;
        for (;;) {
            try {
                await writeFile(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { flag: 'wx' });
                break;
            } catch (error) {
                // A vanished/read-only/full runtime directory is a filesystem failure, not another lock holder.
                // Retrying it as contention can spin forever, including after fixture/engine teardown.
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                const holder = await readJsonIfExists<{ pid?: number; at?: string }>(lock).catch(() => undefined);
                const stale = !holder?.pid || !isProcessAlive(holder.pid) || (holder.at !== undefined && Date.now() - Date.parse(holder.at) > LOCK_STALE_MS);
                if (stale) await rm(lock, { force: true });
                else if (Date.now() > deadline) throw new PtbkError('Another engine is starting or closing this browser profile; try again shortly.', { kind: 'technical', reason: `The lock ${lock} is held by PID ${holder.pid}.` });
                else await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        try {
            return await action();
        } finally {
            await rm(lock, { force: true });
        }
    }

    /** Reads a profile's pool record. */
    public async read(profile: string): Promise<PoolRecord | undefined> {
        return (await readJsonIfExists<PoolRecord>(this.file(profile)).catch(() => undefined)) ?? undefined;
    }

    /** Whether the recorded process is the live browser it was (same PID and start, DevTools answering). */
    private async alive(record: PoolRecord): Promise<boolean> {
        if ((await verifyRecordedProcess(record.pid, record.launchedAt)) !== 'verified') return false;
        try {
            const response = await fetch(`http://127.0.0.1:${record.port}/json/version`, { signal: AbortSignal.timeout(3000) });
            return response.ok;
        } catch {
            return false;
        }
    }

    /** Connections of engines that still run. */
    private live(record: PoolRecord): Record<string, PoolConnection> {
        return Object.fromEntries(Object.entries(record.connections).filter(([, connection]) => isProcessAlive(connection.pid)));
    }

    /**
     * Connects an engine to the profile's shared browser: joins a live process, or launches one (detached from the
     * engine, so it outlives it while others use it). A profile held by a browser Promptbook did not launch is a
     * conflict, never seized.
     */
    public async connect(input: {
        readonly profile: string;
        readonly executable: string;
        readonly headless: boolean;
        readonly args: readonly string[];
        readonly project: string;
        readonly instanceId: string;
        /** Absolute end of the caller's shared startup/recovery budget. */
        readonly startupDeadline?: number;
    }): Promise<{ readonly record: PoolRecord; readonly launched: boolean }> {
        const deadline = input.startupDeadline ?? Date.now() + BROWSER_STARTUP_TIMEOUT_MS;
        return await this.locked(input.profile, async () => {
            const connection: PoolConnection = { instanceId: input.instanceId, project: input.project, pid: process.pid, since: new Date().toISOString() };
            const existing = await this.read(input.profile);
            if (existing && (await this.alive(existing))) {
                const record: PoolRecord = { ...existing, connections: { ...this.live(existing), [input.instanceId]: connection } };
                await writeJsonAtomic(this.file(input.profile), record);
                return { record, launched: false };
            }
            const holder = await profileOwnerPid(input.profile);
            if (holder && holder !== existing?.pid) {
                throw new PtbkError(`The browser profile ${input.profile} is in use by a browser Promptbook did not start (PID ${holder}).`, {
                    kind: 'conflict',
                    reason: 'Promptbook never takes over or terminates a browser it did not launch.',
                    next: ['Close that browser to let Promptbook start the profile, or choose another profile (ptbk tool modify <name> --profile-source …).'],
                });
            }
            const launched = await launchBrowser(input.executable, input.profile, input.headless, input.args, deadline);
            const record: PoolRecord = { version: 1, profile: input.profile, executable: input.executable, ...launched, headless: input.headless, args: input.args, connections: { [input.instanceId]: connection } };
            await writeJsonAtomic(this.file(input.profile), record);
            return { record, launched: true };
        });
    }

    /**
     * Disconnects an engine: its connection ends; the shared process stays for the remaining engines and is closed after
     * the last one (its profile data stays). Returns what happened to the process.
     */
    public async disconnect(profile: string, instanceId: string, lastKnown?: PoolRecord): Promise<'closed' | 'kept' | 'none'> {
        return await this.locked(profile, async () => {
            const record = await this.read(profile);
            if (!record) {
                // The record was lost (its directory was removed): a process this engine last saw as its sole user's is
                // still closed, never one other engines were known to use.
                if (lastKnown && Object.keys(lastKnown.connections).every((id) => id === instanceId)) {
                    await closeBrowser(lastKnown);
                    return 'closed';
                }
                return 'none';
            }
            const { [instanceId]: _left, ...others } = this.live(record);
            void _left;
            if (Object.keys(others).length) {
                await writeJsonAtomic(this.file(profile), { ...record, connections: others });
                return 'kept';
            }
            await closeBrowser(record);
            await rm(this.file(profile), { force: true });
            return 'closed';
        });
    }

    /**
     * Restarts the shared process with the same profile and arguments (every connected engine reconnects to the new
     * one). Returns the engines it affected.
     */
    public async restart(profile: string): Promise<{ readonly record?: PoolRecord; readonly affected: readonly PoolConnection[] }> {
        return await this.locked(profile, async () => {
            const record = await this.read(profile);
            if (!record) return { affected: [] };
            const affected = Object.values(this.live(record));
            await closeBrowser(record);
            const launched = await launchBrowser(record.executable, profile, record.headless, record.args);
            const next: PoolRecord = { ...record, ...launched, connections: this.live(record) };
            await writeJsonAtomic(this.file(profile), next);
            return { record: next, affected };
        });
    }

    /** Kills the shared process (its profile data stays); connected engines reconnect at their next use. */
    public async kill(profile: string): Promise<{ readonly affected: readonly PoolConnection[]; readonly killed: boolean }> {
        return await this.locked(profile, async () => {
            const record = await this.read(profile);
            if (!record) return { affected: [], killed: false };
            const affected = Object.values(this.live(record));
            const identity = await verifyRecordedProcess(record.pid, record.launchedAt);
            if (identity === 'verified') await killVerifiedProcess(record.pid, { group: process.platform !== 'win32' });
            await rm(this.file(profile), { force: true });
            return { affected, killed: identity === 'verified' };
        });
    }

    /**
     * Drops connections of engines that no longer run and closes browsers no running engine uses any more (after a force
     * stop, a crash or a panic). Returns the number of closed browsers.
     */
    public async reconcile(): Promise<number> {
        let closed = 0;
        const files = await readdir(this.directory).catch(() => [] as string[]);
        for (const name of files.filter((file) => file.endsWith('.json'))) {
            const record = await readJsonIfExists<PoolRecord>(join(this.directory, name)).catch(() => undefined);
            if (!record?.profile) continue;
            await this.locked(record.profile, async () => {
                const current = await this.read(record.profile);
                if (!current) return;
                const live = this.live(current);
                if (Object.keys(live).length && (await this.alive(current))) {
                    if (Object.keys(live).length !== Object.keys(current.connections).length) await writeJsonAtomic(this.file(record.profile), { ...current, connections: live });
                    return;
                }
                await closeBrowser(current);
                await rm(this.file(record.profile), { force: true });
                closed++;
            }).catch(() => undefined);
        }
        return closed;
    }
}

/**
 * The PID of the browser holding a profile (Chrome's singleton lock), if it runs.
 *
 * @private browser pools
 */
export async function profileOwnerPid(profile: string): Promise<number | undefined> {
    try {
        const target = await readlink(join(profile, 'SingletonLock'));
        const pid = Number(target.split('-').pop());
        return isProcessAlive(pid) ? pid : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Launches a browser process for a profile, detached from the engine (its own process group), and waits for its
 * DevTools endpoint.
 */
async function launchBrowser(executable: string, profile: string, headless: boolean, args: readonly string[], deadline = Date.now() + BROWSER_STARTUP_TIMEOUT_MS): Promise<{ readonly pid: number; readonly launchedAt: string; readonly port: number; readonly webSocket: string }> {
    if (Date.now() >= deadline) throw new PtbkError('The browser startup budget expired before another launch could start.', { kind: 'technical', phase: 'browser startup' });
    const activePortFile = join(profile, 'DevToolsActivePort');
    // Remove stale discovery data; the browser publishes its own file after choosing a port.
    await rm(activePortFile, { force: true });
    const started = Date.now();
    const child = spawn(executable, [`--user-data-dir=${profile}`, '--remote-debugging-port=0', ...args], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: headless, detached: true });
    // Process creation can itself be slow. Record after spawn so the owned PID is not mistaken for a reused one.
    const launchedAt = new Date().toISOString();
    child.unref();
    // A shared browser can outlive this engine; its diagnostic pipe must not keep the engine alive.
    (child.stderr as { unref?: () => void } | null)?.unref?.();
    let diagnostics = '';
    let announcedPort: number | undefined;
    let failed: string | undefined;
    let connected = false;
    let lastProblem = 'No DevTools endpoint was announced.';
    const observe = (chunk: Buffer): void => {
        diagnostics = (diagnostics + chunk.toString('utf8')).slice(-8192);
        const address = /DevTools listening on (ws:\/\/\S+)/.exec(diagnostics)?.[1];
        if (address) announcedPort = localDebuggerPort(address);
    };
    child.stderr?.on('data', observe);
    child.once('error', (error) => { failed = errorMessage(error); });
    child.once('close', (code, signal) => { failed ??= `The browser exited during startup (${signal ?? `exit code ${String(code)}`}).`; });
    try {
        while (Date.now() < deadline) {
            if (failed) throw new PtbkError(`The browser could not be started: ${failed}`, { kind: 'setup', phase: 'browser startup', reason: redact(diagnostics.trim()) || failed });
            let port = announcedPort;
            if (!port) {
                try {
                    const value = Number((await readFile(activePortFile, 'utf8')).split('\n')[0]);
                    if (Number.isInteger(value) && value > 0 && value <= 65535) port = value;
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') lastProblem = errorMessage(error);
                }
            }
            if (port && child.pid && Date.now() < deadline) {
                try {
                    const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(Math.max(1, Math.min(3000, deadline - Date.now()))) });
                    if (!response.ok) throw new Error(`DevTools returned HTTP ${response.status}.`);
                    const version = await response.json() as { webSocketDebuggerUrl?: unknown };
                    if (typeof version.webSocketDebuggerUrl !== 'string' || localDebuggerPort(version.webSocketDebuggerUrl) !== port) throw new Error('DevTools returned no matching local browser WebSocket endpoint.');
                    if (failed) throw new Error(failed);
                    connected = true;
                    return { pid: child.pid, launchedAt, port, webSocket: version.webSocketDebuggerUrl };
                } catch (error) {
                    // A written port or an announcement is not proof that the HTTP endpoint is ready yet.
                    lastProblem = errorMessage(error);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.min(200, deadline - Date.now()))));
        }
        throw new PtbkError(`The browser did not start in time (${Math.round((Date.now() - started) / 1000)}s waiting for DevTools).`, {
            kind: 'technical', phase: 'browser startup',
            reason: redact(`${lastProblem} Endpoint file: ${activePortFile}.${diagnostics.trim() ? ` Browser diagnostics: ${diagnostics.trim()}` : ''}`),
        });
    } finally {
        // Every failed attempt owns this exact child, including failures after its port file appeared.
        if (!connected && child.pid && child.exitCode === null && child.signalCode === null) await killVerifiedProcess(child.pid, { group: process.platform !== 'win32' });
        child.stderr?.removeListener('data', observe);
        if (connected) child.stderr?.resume();
        else child.stderr?.destroy();
    }
}

/** Only a loopback browser endpoint announced by this launch can become a pool connection. */
function localDebuggerPort(address: string): number | undefined {
    try {
        const url = new URL(address);
        const port = Number(url.port);
        if (url.protocol === 'ws:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password && url.pathname.startsWith('/devtools/browser/') && Number.isInteger(port) && port > 0 && port <= 65535) return port;
    } catch { /* An incomplete diagnostic line is not an endpoint. */ }
    return undefined;
}

/**
 * Closes a pool's browser: a graceful `Browser.close` first (the profile shuts down cleanly), then the verified process
 * (and its group) is killed if it is still there. A process that is no longer the recorded one is never touched.
 */
async function closeBrowser(record: PoolRecord): Promise<void> {
    if ((await verifyRecordedProcess(record.pid, record.launchedAt)) !== 'verified') return;
    await new Promise<void>((resolve) => {
        try {
            const socket = new WebSocket(record.webSocket);
            const timer = setTimeout(() => {
                socket.close();
                resolve();
            }, 2000);
            socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Browser.close' })));
            socket.addEventListener('message', () => {
                clearTimeout(timer);
                socket.close();
                resolve();
            });
            socket.addEventListener('error', () => {
                clearTimeout(timer);
                resolve();
            });
        } catch {
            resolve();
        }
    });
    const deadline = Date.now() + CLOSE_GRACE_MS;
    while (isProcessAlive(record.pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 200));
    if (isProcessAlive(record.pid) && (await verifyRecordedProcess(record.pid, record.launchedAt)) === 'verified') await killVerifiedProcess(record.pid, { group: process.platform !== 'win32' });
}
