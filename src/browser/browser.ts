import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { shortHash, shortId } from '../common/ids.js';
import { isProcessAlive, terminateProcessTree, which } from '../common/process.js';
import { MIGRATED_BROWSER_NAME } from '../project/migrations.js';
import { describeProfileSource, type BrowserToolRecord, type BrowserVariant, type ProfileSource } from '../tools/model.js';
import type { Project } from '../project/workspace.js';
import type { BridgeTool } from '../engine/bridge.js';
import type { TaskChats } from '../chats/task-chats.js';
import type { BrowserDetailView } from '../engine/snapshot.js';
import type { ControlOutcome } from '../service/actions.js';
import { createRedactor } from '../common/redact.js';
import { promptbookAppData } from '../common/app-data.js';
import { BrowserRecorder, type ScreencastPort } from './recording.js';
import type { BrowserFleet } from './fleet.js';

/**
 * Maximal page text returned to an agent.
 */
const MAX_PAGE_TEXT = 20_000;

/**
 * How long Chrome may take to expose its DevTools endpoint.
 */
const STARTUP_TIMEOUT_MS = 30_000;

/**
 * Bounded automatic launch attempts before a failure becomes a visible blocker.
 */
const LAUNCH_ATTEMPTS = 3;

/**
 * Delay before an automatic relaunch attempt (doubles per attempt).
 */
const LAUNCH_RETRY_MS = 3000;

/**
 * Candidate executables of each browser adapter per platform (in preference order).
 */
function browserCandidates(variant: BrowserVariant): { paths: string[]; names: string[] } {
    const chrome = { mac: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'], win: [join('Google', 'Chrome', 'Application', 'chrome.exe')], names: ['google-chrome', 'google-chrome-stable', 'chrome'] };
    const chromium = { mac: ['/Applications/Chromium.app/Contents/MacOS/Chromium'], win: [join('Chromium', 'Application', 'chrome.exe')], names: ['chromium', 'chromium-browser'] };
    const edge = { mac: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'], win: [join('Microsoft', 'Edge', 'Application', 'msedge.exe')], names: ['microsoft-edge', 'microsoft-edge-stable', 'msedge'] };
    const brave = { mac: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'], win: [] as string[], names: [] as string[] };
    // CHROME prefers Google Chrome and accepts another installed Chrome-compatible browser when it is absent.
    const groups = variant === 'CHROMIUM' ? [chromium] : variant === 'EDGE' ? [edge] : [chrome, chromium, edge, brave];
    const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean) as string[];
    const paths = groups.flatMap((group) => (process.platform === 'darwin' ? group.mac : process.platform === 'win32' ? roots.flatMap((root) => group.win.map((relative) => join(root, relative))) : []));
    return { paths, names: groups.flatMap((group) => group.names) };
}

/**
 * Locates the executable of a browser tool (its explicit executable, `CHROME_PATH`, standard locations, PATH).
 *
 * @private project browser
 */
export async function findBrowserExecutable(tool: Pick<BrowserToolRecord, 'variant' | 'executable'>, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const configured = tool.executable ?? env.CHROME_PATH;
    if (configured) return (await pathExists(configured)) ? configured : await which(configured, env);
    const candidates = browserCandidates(tool.variant);
    for (const candidate of candidates.paths) if (await pathExists(candidate)) return candidate;
    for (const name of candidates.names) {
        const found = await which(name, env);
        if (found) return found;
    }
    return undefined;
}

export { promptbookAppData };

/**
 * The dedicated Promptbook-managed browser profile shared by this user's projects (not the user's own Chrome profile).
 *
 * @private project browser
 */
export function globalBrowserProfile(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'browser-profile');
}

/**
 * The user's ordinary Chrome user-data directory on this platform.
 *
 * @private project browser
 */
export function userChromeProfile(env: NodeJS.ProcessEnv = process.env): string {
    if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    if (process.platform === 'win32') return join(env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'User Data');
    return join(homedir(), '.config', 'google-chrome');
}

/**
 * Resolves the profile directory of a browser tool at runtime: the managed global profile (per OS user), an isolated
 * project profile in `.ptbk/` (separate per instance), the user's Chrome profile, or a custom path (relative paths
 * resolve against the project).
 *
 * @private project browser
 */
export function browserProfileDirectory(project: Project, tool: Pick<BrowserToolRecord, 'name' | 'profile'>, env: NodeJS.ProcessEnv = process.env): string {
    switch (tool.profile.source) {
        case 'MANAGED_GLOBAL':
            return tool.profile.path ? resolve(promptbookAppData(env), tool.profile.path) : globalBrowserProfile(env);
        case 'PROJECT':
            // The first (migrated) browser keeps the historical location so existing sessions survive.
            return tool.profile.path ? resolve(project.root, tool.profile.path) : tool.name === MIGRATED_BROWSER_NAME ? project.runtime.browserProfile : join(project.runtime.root, 'browser-profiles', tool.name);
        case 'USER_EXISTING':
            return tool.profile.path ? resolve(tool.profile.path) : userChromeProfile(env);
        case 'CUSTOM':
            return resolve(project.root, tool.profile.path ?? '.');
    }
}

/**
 * Whether a profile source is shared beyond this project (claimed per profile across projects, released after tasks).
 */
function isSharedSource(source: ProfileSource): boolean {
    return source !== 'PROJECT';
}

/**
 * Cross-project ownership of a shared profile: one project's automation at a time (`<app data>/locks/`).
 *
 * Returns a release function, or the PID of the live owner when another process holds it.
 */
async function claimProfile(profileDirectory: string, project: Project, env: NodeJS.ProcessEnv): Promise<{ release: () => Promise<void> } | { owner: number; project?: string }> {
    const directory = await ensureDirectory(join(promptbookAppData(env), 'locks'));
    const path = join(directory, `browser-${shortHash(profileDirectory, 16)}.json`);
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            await writeFile(path, JSON.stringify({ pid: process.pid, project: project.root, profile: profileDirectory, at: new Date().toISOString() }), { flag: 'wx' });
            return { release: async () => await rm(path, { force: true }) };
        } catch {
            const holder = await readFile(path, 'utf8')
                .then((text) => JSON.parse(text) as { pid?: number; project?: string })
                .catch(() => undefined);
            if (holder?.pid === process.pid) return { release: async () => await rm(path, { force: true }) };
            if (holder?.pid && isProcessAlive(holder.pid)) return { owner: holder.pid, project: holder.project };
            // A stale claim of a process that no longer runs is removed, never a live one.
            await rm(path, { force: true });
        }
    }
    return { owner: -1 };
}

/**
 * Checks whether another browser process currently owns a profile (Chrome's singleton lock).
 *
 * @private project browser
 */
export async function profileOwner(profileDirectory: string): Promise<number | undefined> {
    try {
        const target = await readlink(join(profileDirectory, 'SingletonLock'));
        const pid = Number(target.split('-').pop());
        return isProcessAlive(pid) ? pid : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Whether a graphical display is available for a visible window.
 */
function hasDisplay(env: NodeJS.ProcessEnv): boolean {
    if (process.platform !== 'linux') return true;
    return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
}

/**
 * Minimal Chrome DevTools Protocol connection (Node's built-in WebSocket).
 */
class CdpConnection {
    private nextId = 1;
    private readonly pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>();
    private readonly listeners = new Set<(message: Record<string, unknown>) => void>();
    private readonly closeListeners = new Set<() => void>();

    private constructor(private readonly socket: WebSocket) {
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(String(event.data)) as Record<string, unknown>;
            if (typeof message.id === 'number') {
                const entry = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (!entry) return;
                if (message.error) entry.reject(new Error(String((message.error as { message?: string }).message ?? 'CDP error')));
                else entry.resolve((message.result ?? {}) as Record<string, unknown>);
            } else for (const listener of this.listeners) listener(message);
        });
        socket.addEventListener('close', () => {
            for (const entry of this.pending.values()) entry.reject(new Error('The browser connection closed.'));
            this.pending.clear();
            for (const listener of [...this.closeListeners]) listener();
        });
    }

    /** Opens a connection. */
    public static async open(url: string): Promise<CdpConnection> {
        const socket = new WebSocket(url);
        await new Promise<void>((resolve, reject) => {
            socket.addEventListener('open', () => resolve(), { once: true });
            socket.addEventListener('error', () => reject(new Error(`Cannot connect to the browser at ${url}.`)), { once: true });
        });
        return new CdpConnection(socket);
    }

    /** Sends a command. */
    public send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<Record<string, unknown>> {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
    }

    /** Waits for an event. */
    public waitFor(method: string, timeoutMs: number, sessionId?: string): Promise<void> {
        return new Promise((resolve) => {
            const timer = setTimeout(done, timeoutMs);
            const listener = (message: Record<string, unknown>): void => {
                if (message.method === method && (!sessionId || message.sessionId === sessionId)) done();
            };
            const self = this;
            function done(): void {
                clearTimeout(timer);
                self.listeners.delete(listener);
                resolve();
            }
            this.listeners.add(listener);
        });
    }

    /** Subscribes to protocol events; returns the unsubscribe function. */
    public on(listener: (message: Record<string, unknown>) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** Notifies when the connection closes (browser exit or crash). */
    public onClose(listener: () => void): void {
        this.closeListeners.add(listener);
    }

    /** Closes the socket (an intentional close does not notify close listeners). */
    public close(): void {
        this.closeListeners.clear();
        this.socket.close();
    }
}

/**
 * Observed health of the project browser (engine-owned diagnosis and recovery; never inferred from configuration).
 *
 * @private project browser
 */
export type BrowserHealth = {
    state: BrowserDetailView['state'];
    checkedAt?: string;
    pid?: number;
    profilePath?: string;
    actualMode?: 'headless' | 'headful';
    executable?: string;
    ownership: BrowserDetailView['ownership'];
    lastFailure?: BrowserDetailView['lastFailure'];
    recovery: NonNullable<BrowserDetailView['recovery']>;
    lastAction?: BrowserDetailView['lastAction'];
};

/**
 * The effective configuration of one browser tool as the service resolves it.
 *
 * @private project browser
 */
export type BrowserTarget = {
    /** Effective record (the saved one with this invocation's temporary overrides). */
    readonly tool: BrowserToolRecord;
    /** Temporary invocation overrides change it (the saved record stays in ptbk.json). */
    readonly overridden: boolean;
};

/**
 * One named browser tool of the project: one profile and one automation owner at a time, shared by the project's
 * agents. A launched process keeps the configuration it was acquired with (retained use) until the task that uses
 * it releases it; later selections see the new saved configuration.
 *
 * @private project browser
 */
export class ProjectBrowser {
    private child?: ChildProcess;
    /** Release of the cross-project claim of a shared profile. */
    private releaseClaim?: () => Promise<void>;
    private connection?: CdpConnection;
    private sessionId?: string;
    private note?: string;
    /** Configuration the running process was launched with (retained while a task uses it). */
    private launchedWith?: BrowserToolRecord;
    /** A launch in progress (concurrent automatic/manual starts share it: never two owners). */
    private launching?: Promise<{ connection: CdpConnection; sessionId: string }>;
    /** The current task used the browser (a restart waits for the task boundary). */
    private usedByTask = false;
    /** A manual restart waits for the current task to release the browser. */
    private pendingRestart = false;
    /** Observed health, diagnostics and recovery. */
    private health: BrowserHealth = { state: 'not-started', ownership: { state: 'unknown' }, recovery: { attempts: 0, state: 'idle' } };
    /** Task-linked recording of browser activity (`traces/<task-file-basename>/video/`). */
    public readonly recorder: BrowserRecorder;

    public constructor(
        private readonly project: Project,
        /** Name of the browser tool this instance serves. */
        public readonly name: string,
        private readonly target: () => BrowserTarget | undefined,
        private readonly env: NodeJS.ProcessEnv,
        /** Publishes health changes to every view. */
        private readonly onChange: () => void = () => undefined,
        recordingEnabled: () => boolean = () => true,
    ) {
        this.recorder = new BrowserRecorder(project, recordingEnabled, env);
    }

    /** Configuration of the next use: the retained one while a task holds the process, otherwise the saved one. */
    private config(): BrowserToolRecord | undefined {
        if (this.child && this.usedByTask && this.launchedWith) return this.launchedWith;
        return this.target()?.tool;
    }

    /** Whether a task currently holds this browser. */
    public get inUse(): boolean {
        return this.usedByTask && Boolean(this.child);
    }

    /** Whether the running process still uses a configuration that was changed, disabled or removed meanwhile. */
    public get retained(): boolean {
        if (!this.child || !this.launchedWith) return false;
        const saved = this.target()?.tool;
        return !saved || !saved.isEnabled || JSON.stringify(saved) !== JSON.stringify(this.launchedWith);
    }

    /** Updates the observed health and notifies the views. */
    private setHealth(changes: Partial<BrowserHealth>): void {
        this.health = { ...this.health, ...changes, checkedAt: new Date().toISOString() };
        this.onChange();
    }

    /** Records a real launch/connection failure with redacted evidence. */
    private recordFailure(error: unknown): void {
        const redact = createRedactor();
        const details = error instanceof PtbkError ? error.details : undefined;
        this.setHealth({ lastFailure: { at: new Date().toISOString(), summary: redact(errorMessage(error)), evidence: details?.reason ? redact(details.reason) : undefined } });
    }

    /**
     * The browser as the engine sees it: effective profile source and resolved path, requested/actual mode, health,
     * ownership, last failure and recovery. A profile path is diagnostic data, never permission to read its contents.
     */
    public inspect(): BrowserDetailView {
        const target = this.target();
        const saved = target?.tool;
        const effective = this.config() ?? saved;
        const profilePath = effective ? browserProfileDirectory(this.project, effective, this.env) : '';
        const savedPath = saved ? browserProfileDirectory(this.project, saved, this.env) : undefined;
        const retained = this.retained;
        return {
            name: this.name,
            variant: effective?.variant ?? 'CHROME',
            isEnabled: saved?.isEnabled ?? false,
            source: effective?.profile.source ?? 'MANAGED_GLOBAL',
            sourceLabel: effective ? describeProfileSource(effective.profile.source, effective.profile.path) : 'not configured',
            profilePath,
            savedProfile: target?.overridden ? 'overridden for this process (command-line flags); the saved tool stays in ptbk.json' : undefined,
            pending: retained
                ? saved
                    ? `The current task keeps using the configuration it acquired; the saved change${savedPath && savedPath !== profilePath ? ` (profile ${savedPath})` : ''} applies after it releases the browser.`
                    : 'This tool was disabled or removed; the current task finishes with it, no new selection uses it.'
                : this.pendingRestart
                  ? 'A browser restart waits for the current task to release the browser.'
                  : undefined,
            retained: retained || undefined,
            inUse: this.inUse || undefined,
            mode: { requested: effective?.isHeadless === false ? 'headful' : 'headless', actual: this.child ? this.health.actualMode : undefined, note: this.note },
            executable: this.health.executable,
            state: this.health.state,
            pid: this.child?.pid,
            ownership: this.health.ownership,
            lastFailure: this.health.lastFailure,
            recovery: this.health.recovery,
            lastAction: this.health.lastAction,
            checkedAt: this.health.checkedAt,
        };
    }

    /** Records the outcome of a manual browser action. */
    private acted(action: string, state: NonNullable<BrowserHealth['lastAction']>['state'], outcome: string): ControlOutcome {
        this.setHealth({ lastAction: { action, at: new Date().toISOString(), outcome, state } });
        return { action: `browser-${action}`, outcome, applied: state !== 'failed', completed: state === 'succeeded' };
    }

    /**
     * Diagnostic recheck (no launch, no change): browser executable, profile existence and ownership, and the live
     * connection when the browser runs.
     */
    public async recheck(): Promise<ControlOutcome> {
        const tool = this.config();
        if (!tool) return this.acted('recheck', 'failed', `The browser tool "${this.name}" is no longer configured.`);
        const findings: string[] = [];
        const executable = await findBrowserExecutable(tool, this.env);
        findings.push(executable ? `browser ${executable}` : `no ${tool.variant === 'CHROME' ? 'Chrome-compatible' : tool.variant} browser installed`);
        const profile = browserProfileDirectory(this.project, tool, this.env);
        const source = tool.profile.source;
        const exists = await pathExists(profile);
        findings.push(exists ? `profile ${profile}` : source === 'USER_EXISTING' || source === 'CUSTOM' ? `profile ${profile} does not exist` : `profile ${profile} is created on first use`);
        const holder = this.child ? undefined : await profileOwner(profile);
        const ownership: BrowserDetailView['ownership'] = this.child ? { state: 'owned' } : holder ? { state: 'busy', holder: `browser PID ${holder}` } : { state: 'free' };
        if (holder) findings.push(`profile in use by browser PID ${holder}`);
        let state = this.health.state;
        if (this.connection) {
            try {
                await Promise.race([this.connection.send('Browser.getVersion'), new Promise((_, reject) => setTimeout(() => reject(new Error('no answer within 5 s')), 5000))]);
                state = 'running';
                findings.push('connection healthy');
            } catch (error) {
                this.connectionLost(`The browser stopped answering: ${errorMessage(error)}`);
                state = 'failed';
                findings.push('connection lost (the next use relaunches it)');
            }
        } else if (state === 'running') state = 'stopped';
        this.setHealth({ state, executable: executable ?? undefined, ownership });
        const healthy = Boolean(executable) && (exists || source === 'MANAGED_GLOBAL' || source === 'PROJECT') && !holder && state !== 'failed';
        return this.acted('recheck', healthy ? 'succeeded' : 'failed', `${healthy ? 'Browser diagnostics OK' : 'Browser problem found'}: ${findings.join('; ')}.`);
    }

    /** Retries browser startup now (sharing any launch already in progress); a shared profile is released again when idle. */
    public async retry(): Promise<ControlOutcome> {
        if (this.connection && this.sessionId) return this.acted('retry', 'succeeded', `The browser "${this.name}" is already running.`);
        this.setHealth({ recovery: { ...this.health.recovery, attempts: 0, state: 'retrying' } });
        try {
            await this.ensure();
        } catch (error) {
            return this.acted('retry', 'failed', `Startup failed: ${errorMessage(error)}`);
        }
        if (!this.usedByTask) this.releaseShared();
        return this.acted('retry', 'succeeded', this.child ? `The browser "${this.name}" started.` : `The browser "${this.name}" started successfully and was released again (shared profile, no task needs it now).`);
    }

    /**
     * Restarts only this project's own browser process, preserving the selected profile and its sessions. While a task
     * uses the browser the restart waits for that task's boundary instead of breaking its work.
     */
    public async restart(): Promise<ControlOutcome> {
        if (this.usedByTask) {
            this.pendingRestart = true;
            return this.acted('restart', 'deferred', 'The current task is using the browser; the restart happens when it finishes.');
        }
        return await this.restartNow();
    }

    /** Performs a restart at a safe boundary. */
    private async restartNow(): Promise<ControlOutcome> {
        this.pendingRestart = false;
        const wasRunning = Boolean(this.child);
        this.close();
        const shared = isSharedSource(this.config()?.profile.source ?? 'MANAGED_GLOBAL');
        if (shared) return this.acted('restart', 'succeeded', wasRunning ? `Closed the browser "${this.name}"; the next use starts it again with the same profile.` : 'The browser was not running; the next use starts it with the same profile.');
        try {
            await this.ensure();
            return this.acted('restart', 'succeeded', `Restarted the browser "${this.name}" with the same profile.`);
        } catch (error) {
            return this.acted('restart', 'failed', `The browser did not start again: ${errorMessage(error)}`);
        }
    }

    /**
     * After a task: performs a deferred restart, ends a retained use of a changed/disabled/removed configuration and
     * releases a shared profile.
     */
    public async taskFinished(): Promise<void> {
        const retained = this.retained;
        this.usedByTask = false;
        if (this.pendingRestart) await this.restartNow().catch(() => undefined);
        if (retained) this.close();
        this.releaseShared();
    }

    /** Handles a lost connection: stops only this project's browser process; the next use relaunches it. */
    private connectionLost(reason: string): void {
        this.navigationListener?.();
        this.navigationListener = undefined;
        this.connection = undefined;
        this.sessionId = undefined;
        if (this.child) terminateProcessTree(this.child);
        this.child = undefined;
        void this.releaseProfile();
        this.recordFailure(new PtbkError(`The connection to the browser "${this.name}" was lost.`, { kind: 'technical', reason }));
        this.setHealth({ state: 'failed', recovery: { ...this.health.recovery, state: 'retrying' } });
    }

    /** Unsubscribes the page-transition listener of the current connection. */
    private navigationListener?: () => void;

    /** Ensures the browser runs and recording of the attached task has begun. */
    private async active(): Promise<{ connection: CdpConnection; sessionId: string }> {
        const target = await this.ensure();
        this.usedByTask = true;
        // Page transitions (including link clicks and redirects) are listed with the recording segment.
        this.navigationListener ??= target.connection.on((message) => {
            if (message.method !== 'Page.frameNavigated' || message.sessionId !== target.sessionId) return;
            const frame = (message.params as { frame?: { parentId?: string; url?: string } }).frame;
            if (frame && !frame.parentId && frame.url && frame.url !== 'about:blank') this.recorder.visited(frame.url);
        });
        const port: ScreencastPort = {
            send: (method, params) => target.connection.send(method, params ?? {}, target.sessionId),
            onFrame: (listener) =>
                target.connection.on((message) => {
                    if (message.method !== 'Page.screencastFrame' || message.sessionId !== target.sessionId) return;
                    const params = message.params as { data: string; sessionId: number; metadata?: { timestamp?: number } };
                    listener({ data: params.data, sessionId: params.sessionId, timestamp: params.metadata?.timestamp });
                }),
        };
        await this.recorder.begin(port);
        return target;
    }

    /**
     * Launches (or reuses) the browser and attaches to one page. A technical launch failure is retried automatically
     * within a bound; concurrent callers share one launch, so automatic and manual recovery never start two owners.
     */
    private async ensure(): Promise<{ connection: CdpConnection; sessionId: string }> {
        if (this.connection && this.sessionId) return { connection: this.connection, sessionId: this.sessionId };
        this.launching ??= this.launchWithRecovery().finally(() => {
            this.launching = undefined;
        });
        return await this.launching;
    }

    /** Bounded automatic launch recovery with recorded attempts, causes and next retry. */
    private async launchWithRecovery(): Promise<{ connection: CdpConnection; sessionId: string }> {
        for (let attempt = 1; ; attempt++) {
            this.setHealth({ state: this.health.lastFailure ? 'recovering' : 'starting', recovery: { ...this.health.recovery, attempts: attempt - 1 } });
            try {
                const target = await this.launchOnce();
                this.setHealth({ state: 'running', ownership: { state: 'owned' }, recovery: { attempts: 0, state: 'idle' } });
                return target;
            } catch (error) {
                this.recordFailure(error);
                const kind = error instanceof PtbkError ? error.details.kind : 'technical';
                if (kind !== 'technical' || attempt >= LAUNCH_ATTEMPTS) {
                    this.setHealth({ state: 'failed', recovery: { attempts: attempt, state: 'blocked', blocker: kind === 'conflict' ? 'The profile is in use by another owner; ptbk retries when a task needs the browser.' : kind === 'technical' ? `Startup failed ${attempt} times; the next task use retries.` : 'Needs setup: see the last failure.' } });
                    throw error;
                }
                const delay = LAUNCH_RETRY_MS * 2 ** (attempt - 1);
                this.setHealth({ state: 'recovering', recovery: { attempts: attempt, state: 'retrying', nextRetryAt: new Date(Date.now() + delay).toISOString() } });
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    /** One launch attempt of the configured browser and profile. */
    private async launchOnce(): Promise<{ connection: CdpConnection; sessionId: string }> {
        const tool = this.target()?.tool;
        if (!tool) throw new PtbkError(`The browser tool "${this.name}" is not configured.`, { kind: 'configuration', next: ['Add a browser with `ptbk tool add BROWSER …`.'] });
        if (!tool.isEnabled) throw new PtbkError(`The browser tool "${this.name}" is disabled.`, { kind: 'configuration', next: [`Enable it: ptbk tool enable ${this.name}`] });
        const executable = await findBrowserExecutable(tool, this.env);
        if (!executable) throw new PtbkError(`No ${tool.variant === 'CHROME' ? 'Chrome-compatible' : tool.variant} browser is installed for "${this.name}".`, { kind: 'setup', next: [`Install Google Chrome or Chromium, or set its executable: ptbk tool modify ${this.name} --executable <path>`] });
        const source = tool.profile.source;
        const profile = browserProfileDirectory(this.project, tool, this.env);
        this.health = { ...this.health, executable, profilePath: profile };
        if (source === 'USER_EXISTING' || source === 'CUSTOM') {
            // An existing profile is reused as it is; it is never created, copied or migrated implicitly.
            if (!(await pathExists(profile))) throw new PtbkError(`The selected browser profile ${profile} does not exist.`, { kind: 'configuration', next: [`Choose another profile: ptbk tool modify ${this.name} --profile-source MANAGED_GLOBAL|PROJECT|USER_EXISTING|CUSTOM [--profile-path <path>]`] });
        } else await ensureDirectory(profile);
        this.launchedWith = tool;
        if (isSharedSource(source)) {
            let claim = await claimProfile(profile, this.project, this.env);
            for (let attempt = 0; 'owner' in claim && attempt < 10; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                claim = await claimProfile(profile, this.project, this.env);
            }
            if ('owner' in claim) {
                this.setHealth({ ownership: { state: 'busy', holder: `${claim.project ? `project ${claim.project}, ` : ''}PID ${claim.owner}` } });
                throw new PtbkError(`The shared browser profile is in use by another Promptbook project${claim.project ? ` (${claim.project})` : ''}.`, {
                    kind: 'conflict',
                    reason: `One project automates a shared profile at a time; PID ${claim.owner} holds ${profile}.`,
                    next: ['The other project releases it after its current task; ptbk retries later. Choose an isolated profile to avoid waiting.'],
                });
            }
            this.releaseClaim = claim.release;
        }
        let owner = await profileOwner(profile);
        // Ownership is often transient (a browser still shutting down): recheck briefly before involving a person.
        for (let attempt = 0; owner && attempt < 10; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            owner = await profileOwner(profile);
        }
        if (owner) {
            await this.releaseProfile();
            this.setHealth({ ownership: { state: 'busy', holder: `browser PID ${owner}` } });
            throw new PtbkError(`The browser profile ${profile} is in use by another browser (PID ${owner}).`, {
                kind: 'conflict',
                next: [`Close that browser to hand the profile over, or choose another profile (ptbk tool modify ${this.name} --profile-source …).`],
            });
        }
        let headless = tool.isHeadless;
        if (!headless && !hasDisplay(this.env)) {
            headless = true;
            this.note = 'No display is available on this host, so the browser runs headless (no window was shown).';
        }
        const activePortFile = join(profile, 'DevToolsActivePort');
        await writeFile(activePortFile, '').catch(() => undefined);
        const args = [`--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', ...(headless ? ['--headless=new'] : []), 'about:blank'];
        this.health = { ...this.health, actualMode: headless ? 'headless' : 'headful' };
        try {
            return await this.launch(executable, args, activePortFile, headless);
        } catch (error) {
            // A browser that did not come up is stopped and a shared profile is released again.
            this.close();
            throw error;
        }
    }

    /** Starts the browser process and attaches to one page. */
    private async launch(executable: string, args: readonly string[], activePortFile: string, headless: boolean): Promise<{ connection: CdpConnection; sessionId: string }> {
        this.child = spawn(executable, args, { stdio: 'ignore', windowsHide: headless, detached: process.platform !== 'win32' });
        this.child.unref();
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;
        let port: number | undefined;
        while (Date.now() < deadline && !port) {
            const content = await readFile(activePortFile, 'utf8').catch(() => '');
            const value = Number(content.split('\n')[0]);
            if (value > 0) port = value;
            else await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (!port) throw new PtbkError('The browser did not start in time.', { kind: 'technical', reason: `No DevTools port appeared in ${activePortFile} within ${STARTUP_TIMEOUT_MS / 1000}s.` });
        const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { webSocketDebuggerUrl: string };
        const connection = await CdpConnection.open(version.webSocketDebuggerUrl);
        connection.onClose(() => this.connectionLost('The browser process exited or closed its DevTools connection.'));
        const targets = (await connection.send('Target.getTargets')).targetInfos as Array<{ targetId: string; type: string }>;
        const page = targets.find((target) => target.type === 'page') ?? ({ targetId: String((await connection.send('Target.createTarget', { url: 'about:blank' })).targetId), type: 'page' } as const);
        const sessionId = String((await connection.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })).sessionId);
        await connection.send('Page.enable', {}, sessionId);
        await connection.send('Runtime.enable', {}, sessionId);
        this.connection = connection;
        this.sessionId = sessionId;
        return { connection, sessionId };
    }

    /** Evaluates JavaScript in the page and returns its value. */
    private async evaluate<T>(expression: string): Promise<T> {
        const { connection, sessionId } = await this.active();
        const result = await connection.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
        if (result.exceptionDetails) throw new Error(`Page script failed: ${JSON.stringify(result.exceptionDetails).slice(0, 300)}`);
        return (result.result as { value: T }).value;
    }

    /** Text and interactive elements of the current page (elements get stable `ref` numbers). */
    public async read(): Promise<string> {
        const page = await this.evaluate<{ url: string; title: string; text: string; elements: string[] }>(`(() => {
            const elements = [...document.querySelectorAll('a[href], button, input, textarea, select, [role=button]')].slice(0, 200);
            elements.forEach((element, index) => element.setAttribute('data-ptbk-ref', String(index + 1)));
            return {
                url: location.href,
                title: document.title,
                text: (document.body ? document.body.innerText : '').slice(0, ${MAX_PAGE_TEXT}),
                elements: elements.map((element, index) => '[' + (index + 1) + '] ' + element.tagName.toLowerCase() + (element.type ? ' ' + element.type : '') + ' ' + ((element.innerText || element.value || element.placeholder || element.getAttribute('aria-label') || element.getAttribute('href') || '').replace(/\\s+/g, ' ').trim().slice(0, 80))),
            };
        })()`);
        return `${page.title}\n${page.url}\n\n${page.text}\n\nInteractive elements:\n${page.elements.join('\n')}${this.note ? `\n\nNote: ${this.note}` : ''}`;
    }

    /** Navigates and waits for the load event (bounded). */
    public async open(url: string): Promise<string> {
        if (!/^https?:\/\//i.test(url)) throw new PtbkError('Only http(s) URLs can be opened.', { kind: 'usage' });
        const { connection, sessionId } = await this.active();
        const loaded = connection.waitFor('Page.loadEventFired', 30_000, sessionId);
        await connection.send('Page.navigate', { url }, sessionId);
        await loaded;
        const page = await this.read();
        this.recorder.visited(page.split('\n')[1] ?? url);
        return page;
    }

    /** Clicks an element by ref. */
    public async click(reference: number): Promise<string> {
        const ok = await this.evaluate<boolean>(`(() => { const element = document.querySelector('[data-ptbk-ref="${Number(reference)}"]'); if (!element) return false; element.scrollIntoView({ block: 'center' }); element.click(); return true; })()`);
        if (!ok) throw new PtbkError(`No element with ref ${reference}; call browser_read first.`, { kind: 'usage' });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await this.read();
    }

    /** Types into an element by ref (optionally submitting its form); secret fields are never recorded. */
    public async type(reference: number, text: string, submit: boolean): Promise<string> {
        const secret = await this.evaluate<boolean>(`(() => { const element = document.querySelector('[data-ptbk-ref="${Number(reference)}"]'); return Boolean(element && (element.type === 'password' || /otp|one-time|password|passcode/i.test(element.autocomplete || element.name || ''))); })()`);
        if (secret) await this.recorder.pause('secret entry into a password/one-time-code field (not recorded)');
        try {
            return await this.typeInto(reference, text, submit);
        } finally {
            if (secret) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                await this.recorder.resume();
            }
        }
    }

    /** Sets an element's value and dispatches input events. */
    private async typeInto(reference: number, text: string, submit: boolean): Promise<string> {
        const ok = await this.evaluate<boolean>(`(() => {
            const element = document.querySelector('[data-ptbk-ref="${Number(reference)}"]');
            if (!element) return false;
            element.focus();
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
            if (setter) setter.call(element, ${JSON.stringify(text)}); else element.value = ${JSON.stringify(text)};
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            if (${submit ? 'true' : 'false'}) { if (element.form && element.form.requestSubmit) element.form.requestSubmit(); else element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
            return true;
        })()`);
        if (!ok) throw new PtbkError(`No element with ref ${reference}; call browser_read first.`, { kind: 'usage' });
        await new Promise((resolve) => setTimeout(resolve, submit ? 1500 : 200));
        return await this.read();
    }

    /** Saves a screenshot into ignored runtime storage and returns its path. */
    public async screenshot(): Promise<string> {
        const { connection, sessionId } = await this.active();
        const result = await connection.send('Page.captureScreenshot', { format: 'png' }, sessionId);
        const directory = await ensureDirectory(join(this.project.runtime.temporary, 'screenshots'));
        const path = join(directory, `${shortId()}.png`);
        await writeFile(path, Buffer.from(String(result.data), 'base64'));
        return path;
    }

    /** Brings the window forward for a human action (only meaningful with a visible window); the human part is not recorded. */
    public async bringToFront(): Promise<string | undefined> {
        await this.recorder.pause('human action in the project browser (sign-in, two-factor authentication or consent; not recorded)');
        if (!this.connection || !this.sessionId) return this.note;
        await this.connection.send('Page.bringToFront', {}, this.sessionId).catch(() => undefined);
        return this.note;
    }

    /** Stops only the browser process this service launched (never the user's browsers or the profile). */
    public close(): void {
        this.navigationListener?.();
        this.navigationListener = undefined;
        this.connection?.close();
        this.connection = undefined;
        this.sessionId = undefined;
        const wasRunning = Boolean(this.child);
        if (this.child) terminateProcessTree(this.child);
        this.child = undefined;
        void this.releaseProfile();
        if (wasRunning) this.setHealth({ state: 'stopped', ownership: { state: 'free' } });
    }

    /** Releases this project's claim of a shared profile. */
    private async releaseProfile(): Promise<void> {
        const release = this.releaseClaim;
        this.releaseClaim = undefined;
        await release?.().catch(() => undefined);
    }

    /**
     * After a task: a browser on a shared profile (global, user or custom) is closed so other projects can use the
     * profile; the isolated project profile stays open for the next task.
     */
    public releaseShared(): void {
        if (!this.child && !this.releaseClaim) return;
        if (!isSharedSource(this.config()?.profile.source ?? 'MANAGED_GLOBAL')) return;
        this.close();
    }
}

/**
 * Browser tools exposed to agents through the ptbk MCP bridge. Every call resolves the live inventory: a browser
 * added during the task is selectable at the next call; `browser` names a specific tool (account/profile).
 *
 * @private project browser
 */
export function browserTools(fleet: BrowserFleet, chats: TaskChats | undefined, agent: string, onUserChat: (chat: { chat: string; awaited: number }) => void, describe: () => Array<{ name: string; description?: string; profile: string; isHeadless: boolean }>): BridgeTool[] {
    const run = async (action: () => Promise<string>): Promise<{ text: string; isError?: boolean }> => {
        try {
            return { text: await action() };
        } catch (error) {
            return { text: errorMessage(error), isError: true };
        }
    };
    const name = (input: Record<string, unknown>): string | undefined => (typeof input.browser === 'string' && input.browser.trim() ? input.browser.trim() : undefined);
    const browserProperty = { browser: { type: 'string', description: 'Name of the browser tool to use (see browser_list); defaults to the browser this task already uses, else the first enabled one.' } };
    return [
        {
            name: 'browser_list',
            description: "List the project's enabled browser tools (names, descriptions, profile kinds). Choose the one whose account/profile fits the task; never act from a different account merely because it is logged in.",
            inputSchema: { type: 'object', properties: {} },
            handler: () =>
                run(async () => {
                    const browsers = describe();
                    if (!browsers.length) return 'No browser tool is enabled for this project.';
                    return browsers.map((browser) => `- ${browser.name}${browser.description ? `: ${browser.description}` : ''} (${browser.profile}, ${browser.isHeadless ? 'headless' : 'visible window'})`).join('\n');
                }),
        },
        {
            name: 'browser_open',
            description: 'Open a URL in a project browser (persistent logged-in sessions of its profile) and return the page text and interactive elements.',
            inputSchema: { type: 'object', properties: { url: { type: 'string' }, ...browserProperty }, required: ['url'] },
            handler: (input) => run(async () => (await fleet.acquire(name(input))).open(String(input.url ?? ''))),
        },
        {
            name: 'browser_read',
            description: 'Return the text and numbered interactive elements of the current page.',
            inputSchema: { type: 'object', properties: { ...browserProperty } },
            handler: (input) => run(async () => (await fleet.acquire(name(input))).read()),
        },
        {
            name: 'browser_click',
            description: 'Click an interactive element by its number from browser_read.',
            inputSchema: { type: 'object', properties: { ref: { type: 'number' }, ...browserProperty }, required: ['ref'] },
            handler: (input) => run(async () => (await fleet.acquire(name(input))).click(Number(input.ref))),
        },
        {
            name: 'browser_type',
            description: 'Type text into an input by its number from browser_read; optionally submit the form.',
            inputSchema: { type: 'object', properties: { ref: { type: 'number' }, text: { type: 'string' }, submit: { type: 'boolean' }, ...browserProperty }, required: ['ref', 'text'] },
            handler: (input) => run(async () => (await fleet.acquire(name(input))).type(Number(input.ref), String(input.text ?? ''), input.submit === true)),
        },
        {
            name: 'browser_screenshot',
            description: 'Save a screenshot of the current page and return its file path.',
            inputSchema: { type: 'object', properties: { ...browserProperty } },
            handler: (input) => run(async () => (await fleet.acquire(name(input))).screenshot()),
        },
        {
            name: 'browser_request_user_action',
            description: 'Only when a website genuinely requires a human-only step (sign-in, two-factor authentication, consent) that the existing session cannot satisfy: ask the human to act in the project browser. Then end your turn with status waiting-for-user.',
            inputSchema: { type: 'object', properties: { reason: { type: 'string' }, ...browserProperty }, required: ['reason'] },
            handler: (input) =>
                run(async () => {
                    if (!chats) throw new PtbkError('The user is not available in this run; report blocked with the reason instead.', { kind: 'unsupported' });
                    const browser = await fleet.acquire(name(input));
                    const note = await browser.bringToFront();
                    const chat = await chats.askUser({
                        agent,
                        reason: String(input.reason ?? `A website needs your action in the browser "${browser.name}".`),
                        attempted: `I used the existing session of the project browser "${browser.name}"; the website still requires this human-only step.`,
                        question: `Please complete the action in the browser "${browser.name}"${note ? ` (${note})` : ''}, then confirm here.`,
                        choices: ['Done', 'I cannot do it'],
                    });
                    onUserChat(chat);
                    return `The request is in the chat {{${chat.chat}}}, waiting for the user. End your turn now with status waiting-for-user.`;
                }),
        },
    ];
}
