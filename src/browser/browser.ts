import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { shortHash, shortId } from '../common/ids.js';
import { isProcessAlive, terminateProcessTree, which } from '../common/process.js';
import { MIGRATED_BROWSER_NAME } from '../project/migrations.js';
import { describeProfileSource, type BrowserToolRecord, type BrowserVariant, type ProfileSource } from '../tools/model.js';
import type { Project } from '../project/workspace.js';
import type { BrowserDetailView } from '../engine/snapshot.js';
import type { ControlOutcome } from '../service/actions.js';
import { createRedactor } from '../common/redact.js';
import { promptbookAppData } from '../common/app-data.js';
import { BrowserRecorder, type ScreencastPort } from './recording.js';
import { parseKeyPress, type KeyPress } from './input.js';
import {
    MAX_PAGE_TEXT,
    elementObjectScript,
    elementPointScript,
    entryContentScript,
    entryTargetScript,
    focusForEntryScript,
    isFileInputScript,
    programmaticClickScript,
    readPageScript,
    setValueScript,
    submitFormScript,
    viewportScript,
    type PageReading,
} from './page-scripts.js';

/**
 * Window size of a headless browser (a desktop layout, as a person at a desktop sees websites).
 */
const HEADLESS_WINDOW_SIZE = '1280,900';

/**
 * Pause after a click or upload for the page to react.
 */
const ACTION_SETTLE_MS = 1000;

/**
 * Pause after hovering, scrolling or pressing keys.
 */
const HOVER_SETTLE_MS = 500;

/**
 * Pause after typing.
 */
const TYPE_SETTLE_MS = 300;

/**
 * Pause after submitting (and around secret entry, so the recording gap covers it).
 */
const SUBMIT_SETTLE_MS = 1500;

/**
 * Upper bound of repeated key presses in one call.
 */
const MAX_KEY_REPEAT = 100;

/**
 * Upper bound of an agent's page script or raw DevTools command.
 */
const SCRIPT_TIMEOUT_MS = 60_000;

/**
 * Tallest full-page screenshot (taller pages are cut).
 */
const MAX_SCREENSHOT_HEIGHT = 16_000;

/**
 * Pressed-button bit of each mouse button in DevTools mouse events.
 */
const MOUSE_BUTTONS = { left: 1, right: 2, middle: 4 } as const;

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
 * One open page (tab) of a browser.
 *
 * @private project browser
 */
export type BrowserTab = { readonly targetId: string; readonly title: string; readonly url: string };

/**
 * What a pointer action aims at: a numbered element from the last page reading or viewport coordinates.
 *
 * @private project browser
 */
export type PointerTarget = { readonly ref?: number; readonly x?: number; readonly y?: number; readonly force?: boolean };

/**
 * Mouse button and modifiers of a click.
 *
 * @private project browser
 */
export type ClickOptions = { readonly button?: keyof typeof MOUSE_BUTTONS; readonly clickCount?: number; readonly modifiers?: number };

/**
 * Viewport and document size in CSS pixels.
 */
type Viewport = { width: number; height: number; scale: number; pageWidth: number; pageHeight: number; scrollX: number; scrollY: number };

/**
 * Target of text entry as the page reports it.
 */
type EntryTarget = { missing?: boolean; kind: 'text' | 'value' | 'file'; secret: boolean; singleLine: boolean; focused?: boolean; description?: string; visible?: boolean; x?: number; y?: number; covered?: string };

/**
 * Waits for a while.
 */
function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Bounds an operation that a page or the agent's own command could otherwise keep pending.
 */
async function withTimeout<T>(operation: Promise<T>, milliseconds: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([operation, new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new PtbkError(`${label} did not finish within ${milliseconds / 1000}s.`, { kind: 'technical' })), milliseconds)))]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Cuts long text for an agent with a visible note.
 */
function truncate(text: string, limit: number): string {
    return text.length > limit ? `${text.slice(0, limit)}\n… (${text.length - limit} more characters)` : text;
}

/**
 * The error of a ref that no longer points to an element of the current page.
 */
function staleReference(ref: number): PtbkError {
    return new PtbkError(`No element with ref ${ref} on the current page; call browser_read again (refs change when the page changes).`, { kind: 'usage' });
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

    /** Waits for one of the events (bounded); resolves with its parameters, or `undefined` on timeout. */
    public waitFor(method: string | readonly string[], timeoutMs: number, sessionId?: string): Promise<Record<string, unknown> | undefined> {
        const methods = typeof method === 'string' ? [method] : method;
        return new Promise((resolve) => {
            const timer = setTimeout(() => done(undefined), timeoutMs);
            const listener = (message: Record<string, unknown>): void => {
                if (typeof message.method === 'string' && methods.includes(message.method) && (!sessionId || message.sessionId === sessionId)) done((message.params ?? {}) as Record<string, unknown>);
            };
            const self = this;
            function done(params: Record<string, unknown> | undefined): void {
                clearTimeout(timer);
                self.listeners.delete(listener);
                resolve(params);
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
    /** Session of the page (tab) the agent currently works in. */
    private sessionId?: string;
    /** Target of that page. */
    private targetId?: string;
    /** Local DevTools endpoint of the running browser (shared with the agent that holds it). */
    private devtools?: { readonly port: number; readonly webSocket: string };
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
        this.targetId = undefined;
        this.devtools = undefined;
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
        // Recording and page transitions follow the tab the agent currently works in.
        this.navigationListener ??= target.connection.on((message) => {
            if (message.method !== 'Page.frameNavigated' || message.sessionId !== this.sessionId) return;
            const frame = (message.params as { frame?: { parentId?: string; url?: string } }).frame;
            if (frame && !frame.parentId && frame.url && frame.url !== 'about:blank') this.recorder.visited(frame.url);
        });
        const port: ScreencastPort = {
            send: (method, params) => target.connection.send(method, params ?? {}, this.sessionId),
            onFrame: (listener) =>
                target.connection.on((message) => {
                    if (message.method !== 'Page.screencastFrame' || message.sessionId !== this.sessionId) return;
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
        // A running browser whose working tab was closed continues in another tab instead of relaunching.
        const connection = this.connection;
        this.launching ??= (connection ? this.reattach(connection) : this.launchWithRecovery()).finally(() => {
            this.launching = undefined;
        });
        return await this.launching;
    }

    /** Continues in some open tab of the running browser (a new blank one when none is left). */
    private async reattach(connection: CdpConnection): Promise<{ connection: CdpConnection; sessionId: string }> {
        return { connection, sessionId: await this.attachPage(connection, await this.anyPage(connection)) };
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
        // A headless browser gets a desktop-sized window, so websites show the layout a person at a desktop sees.
        const args = [`--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', ...(headless ? ['--headless=new', `--window-size=${HEADLESS_WINDOW_SIZE}`] : []), 'about:blank'];
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
        // The working tab may be closed by the website, the agent or a person; the next use continues in another tab.
        connection.on((message) => {
            if (message.method === 'Target.detachedFromTarget' && (message.params as { sessionId?: string }).sessionId === this.sessionId) {
                this.sessionId = undefined;
                this.targetId = undefined;
            }
        });
        this.connection = connection;
        this.devtools = { port, webSocket: version.webSocketDebuggerUrl };
        const sessionId = await this.attachPage(connection, await this.anyPage(connection));
        return { connection, sessionId };
    }

    /** Evaluates JavaScript in the current page and returns its value. */
    private async evaluate<T>(expression: string): Promise<T> {
        const { connection, sessionId } = await this.active();
        const result = await connection.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
        if (result.exceptionDetails) throw new Error(`Page script failed: ${JSON.stringify(result.exceptionDetails).slice(0, 300)}`);
        return (result.result as { value: T }).value;
    }

    /** Open pages (tabs) of the browser. */
    private async pages(connection: CdpConnection): Promise<BrowserTab[]> {
        const targets = (await connection.send('Target.getTargets')).targetInfos as Array<BrowserTab & { type: string }>;
        return targets.filter((target) => target.type === 'page' && !target.url.startsWith('devtools://')).map(({ targetId, title, url }) => ({ targetId, title, url }));
    }

    /** Some open tab to work in (a new blank tab when none is open). */
    private async anyPage(connection: CdpConnection, except?: string): Promise<string> {
        const page = (await this.pages(connection)).find((candidate) => candidate.targetId !== except);
        return page?.targetId ?? String((await connection.send('Target.createTarget', { url: 'about:blank' })).targetId);
    }

    /** Moves control, and the recording, to one tab of the browser. */
    private async attachPage(connection: CdpConnection, targetId: string): Promise<string> {
        if (this.sessionId && this.targetId === targetId) return this.sessionId;
        const previous = this.sessionId;
        const sessionId = String((await connection.send('Target.attachToTarget', { targetId, flatten: true })).sessionId);
        await connection.send('Page.enable', {}, sessionId);
        await connection.send('Runtime.enable', {}, sessionId);
        this.sessionId = sessionId;
        this.targetId = targetId;
        await connection.send('Target.activateTarget', { targetId }).catch(() => undefined);
        if (previous) {
            await connection.send('Page.stopScreencast', {}, previous).catch(() => undefined);
            await connection.send('Target.detachFromTarget', { sessionId: previous }).catch(() => undefined);
        }
        await this.recorder.retarget();
        return sessionId;
    }

    /** Resolves a tab id or a unique prefix of it. */
    private async resolveTab(connection: CdpConnection, id: string): Promise<string> {
        const wanted = id.trim().toUpperCase();
        const matches = wanted ? (await this.pages(connection)).filter((page) => page.targetId.toUpperCase().startsWith(wanted)) : [];
        if (matches.length !== 1) throw new PtbkError(matches.length ? `The tab id "${id}" matches several tabs; give more of it.` : `No open tab has the id "${id}"; browser_tabs lists them.`, { kind: 'usage' });
        return matches[0]!.targetId;
    }

    /** Waits (bounded) until the current page finished loading. */
    private async settle(timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline && (await this.evaluate<string>('document.readyState').catch(() => 'complete')) !== 'complete') await delay(250);
    }

    /** After an action: continues in a tab the action opened (a link to a new window, `window.open`), as a person would. */
    private async followNewTab(connection: CdpConnection, before: ReadonlySet<string>): Promise<string> {
        const opened = (await this.pages(connection)).filter((page) => !before.has(page.targetId));
        const tab = opened[opened.length - 1];
        if (!tab) return '';
        await this.attachPage(connection, tab.targetId);
        await this.settle(10_000);
        return `The action opened a new tab (${tab.targetId}); you now work in it (browser_tabs switches back).\n`;
    }

    /** Ids of the open tabs (to notice tabs an action opens). */
    private async tabIds(connection: CdpConnection): Promise<Set<string>> {
        return new Set((await this.pages(connection)).map((page) => page.targetId));
    }

    /** Text and numbered interactive elements of the complete current page (dialogs, shadow DOM and same-origin frames included). */
    public async read(): Promise<string> {
        const page = await this.evaluate<PageReading>(readPageScript());
        const tabs = this.connection ? (await this.pages(this.connection)).length : 1;
        const omitted = page.omitted ? `\n… ${page.omitted} more elements are not listed (scroll to them, or use browser_evaluate).` : '';
        return `${page.title}\n${page.url}${tabs > 1 ? `\n(${tabs} tabs are open; browser_tabs lists and switches them)` : ''}\n\n${page.text}\n\nInteractive elements (their numbers are the ref of other browser tools):\n${page.elements.join('\n') || '(none)'}${omitted}${this.note ? `\n\nNote: ${this.note}` : ''}`;
    }

    /** Navigates the current tab (or a new one) to any URL and waits for it to load (bounded). */
    public async open(url: string, newTab = false): Promise<string> {
        const trimmed = url.trim();
        if (!trimmed) throw new PtbkError('Name the URL to open.', { kind: 'usage' });
        // An address without a scheme is a website, as in the address bar (plain HTTP for local addresses).
        const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^(about|blob|data|javascript|mailto|tel|view-source):/i.test(trimmed);
        const address = hasScheme ? trimmed : `${/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(trimmed) ? 'http' : 'https'}://${trimmed}`;
        const { connection } = await this.active();
        if (newTab) await this.attachPage(connection, String((await connection.send('Target.createTarget', { url: 'about:blank' })).targetId));
        const sessionId = this.sessionId!;
        const loaded = connection.waitFor('Page.loadEventFired', 30_000, sessionId);
        const result = await connection.send('Page.navigate', { url: address }, sessionId);
        const failed = typeof result.errorText === 'string' && result.errorText ? `Navigation failed: ${result.errorText}.\n\n` : '';
        const download = result.isDownload === true ? 'The URL started a download.\n\n' : '';
        if (result.loaderId && !failed && !download) await loaded;
        const page = await this.read();
        this.recorder.visited(page.split('\n')[1] ?? address);
        return `${failed}${download}${page}`;
    }

    /** Goes back or forward in the current tab's history, or reloads it. */
    public async navigate(action: 'back' | 'forward' | 'reload'): Promise<string> {
        const { connection, sessionId } = await this.active();
        if (action === 'reload') {
            const loaded = connection.waitFor('Page.loadEventFired', 30_000, sessionId);
            await connection.send('Page.reload', {}, sessionId);
            await loaded;
        } else {
            const history = (await connection.send('Page.getNavigationHistory', {}, sessionId)) as { currentIndex: number; entries: Array<{ id: number }> };
            const entry = history.entries[history.currentIndex + (action === 'back' ? -1 : 1)];
            if (!entry) throw new PtbkError(`This tab has no ${action === 'back' ? 'previous' : 'next'} page in its history.`, { kind: 'usage' });
            // Pages restored from the back/forward cache report a navigation but no new load event.
            const moved = connection.waitFor(['Page.loadEventFired', 'Page.frameNavigated', 'Page.navigatedWithinDocument'], 15_000, sessionId);
            await connection.send('Page.navigateToHistoryEntry', { entryId: entry.id }, sessionId);
            await moved;
            await this.settle(15_000);
        }
        return await this.read();
    }

    /** Lists the open tabs; the one the agent works in is marked with `*`. */
    public async tabs(): Promise<string> {
        const { connection } = await this.active();
        const pages = await this.pages(connection);
        return `Open tabs (* = the tab you work in; a unique prefix of an id is enough):\n${pages.map((page) => `${page.targetId === this.targetId ? '*' : '-'} ${page.targetId}  ${page.title || '(untitled)'}  ${page.url}`).join('\n')}`;
    }

    /** Opens a new tab (optionally at a URL), switches to a tab or closes one. */
    public async tab(action: 'new' | 'select' | 'close', id?: string, url?: string): Promise<string> {
        const { connection } = await this.active();
        if (action === 'new') {
            if (url?.trim()) return await this.open(url, true);
            await this.attachPage(connection, String((await connection.send('Target.createTarget', { url: 'about:blank' })).targetId));
            return await this.read();
        }
        const targetId = id?.trim() ? await this.resolveTab(connection, id) : this.targetId;
        if (!targetId) throw new PtbkError('Name the tab id (browser_tabs lists them).', { kind: 'usage' });
        if (action === 'select') {
            await this.attachPage(connection, targetId);
            return await this.read();
        }
        // The tab to continue in exists before the current one closes (closing the last window may end the browser).
        const replacement = targetId === this.targetId ? await this.anyPage(connection, targetId) : undefined;
        await connection.send('Target.closeTarget', { targetId });
        if (replacement) {
            this.sessionId = undefined;
            this.targetId = undefined;
            await this.attachPage(connection, replacement);
        }
        return `Closed the tab ${targetId}.\n\n${await this.read()}`;
    }

    /** Where a pointer action aims: the visible center of a numbered element, or explicit viewport coordinates. */
    private async aim(target: PointerTarget): Promise<{ point?: { x: number; y: number }; label: string }> {
        if (target.ref === undefined) {
            if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) throw new PtbkError('Give the ref of an element from browser_read, or viewport coordinates x and y in CSS pixels (as in browser_screenshot).', { kind: 'usage' });
            return { point: { x: target.x!, y: target.y! }, label: `the point (${Math.round(target.x!)}, ${Math.round(target.y!)})` };
        }
        const aimed = await this.evaluate<{ missing?: boolean; visible?: boolean; x?: number; y?: number; covered?: string; description?: string }>(elementPointScript(target.ref));
        if (aimed.missing) throw staleReference(target.ref);
        const label = `[${target.ref}] ${aimed.description ?? ''}`.trim();
        if (target.force || !aimed.visible) return { label };
        if (aimed.covered) throw new PtbkError(`${label} is covered by ${aimed.covered} at its center, so a click would hit that instead. Close or scroll away the covering element, click it by coordinates, or pass force: true for a programmatic click.`, { kind: 'usage' });
        return { point: { x: aimed.x!, y: aimed.y! }, label };
    }

    /** Dispatches trusted mouse events (as from a person) at viewport coordinates. */
    private async mouse(point: { x: number; y: number }, options: ClickOptions): Promise<void> {
        const { connection, sessionId } = await this.active();
        const button = options.button ?? 'left';
        const modifiers = options.modifiers ?? 0;
        await connection.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers }, sessionId);
        const clicks = Math.max(1, Math.min(3, Math.round(options.clickCount ?? 1)));
        for (let count = 1; count <= clicks; count++) {
            await connection.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button, buttons: MOUSE_BUTTONS[button], clickCount: count, modifiers }, sessionId);
            await connection.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button, buttons: 0, clickCount: count, modifiers }, sessionId);
        }
    }

    /** Clicks an element or a point; elements without a visible box (or with `force`) are clicked programmatically. */
    private async clickAt(target: PointerTarget, options: ClickOptions): Promise<string> {
        const aimed = await this.aim(target);
        if (aimed.point) {
            await this.mouse(aimed.point, options);
            return `Clicked ${aimed.label}.`;
        }
        if (!(await this.evaluate<boolean>(programmaticClickScript(target.ref!)))) throw staleReference(target.ref!);
        return `Clicked ${aimed.label} programmatically (${target.force ? 'force' : 'it has no visible box on the screen'}).`;
    }

    /** Clicks like a person at an element from browser_read or at viewport coordinates, then reads the page. */
    public async click(target: PointerTarget, options: ClickOptions = {}): Promise<string> {
        const { connection } = await this.active();
        const before = await this.tabIds(connection);
        const done = await this.clickAt(target, options);
        await delay(ACTION_SETTLE_MS);
        const followed = await this.followNewTab(connection, before);
        return `${done}\n${followed}\n${await this.read()}`;
    }

    /** Moves the mouse over an element or a point (menus and tooltips that open on hover). */
    public async hover(target: PointerTarget): Promise<string> {
        const aimed = await this.aim({ ...target, force: false });
        if (!aimed.point) throw new PtbkError(`${aimed.label} has no visible box on the screen to move the mouse over.`, { kind: 'usage' });
        const { connection, sessionId } = await this.active();
        await connection.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: aimed.point.x, y: aimed.point.y }, sessionId);
        await delay(HOVER_SETTLE_MS);
        return `Moved the mouse over ${aimed.label}.\n\n${await this.read()}`;
    }

    /** Scrolls an element into view, or turns the mouse wheel at a point (the page or the scrollable area under it). */
    public async scroll(input: { ref?: number; deltaX?: number; deltaY?: number; x?: number; y?: number }): Promise<string> {
        if (input.ref !== undefined) {
            const aimed = await this.evaluate<{ missing?: boolean; description?: string }>(elementPointScript(input.ref));
            if (aimed.missing) throw staleReference(input.ref);
            return `Scrolled [${input.ref}] ${aimed.description ?? ''} into view.\n\n${await this.read()}`;
        }
        const { connection, sessionId } = await this.active();
        const view = await this.evaluate<Viewport>(viewportScript());
        const deltaX = input.deltaX ?? 0;
        const deltaY = input.deltaY ?? (input.deltaX === undefined ? Math.round(view.height * 0.8) : 0);
        const x = input.x ?? view.width / 2;
        const y = input.y ?? view.height / 2;
        await connection.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY }, sessionId);
        await delay(HOVER_SETTLE_MS);
        const after = await this.evaluate<Viewport>(viewportScript());
        return `Turned the mouse wheel by (${deltaX}, ${deltaY}) at (${Math.round(x)}, ${Math.round(y)}); the page is scrolled to (${Math.round(after.scrollX)}, ${Math.round(after.scrollY)}) of ${after.pageWidth}×${after.pageHeight}.\n\n${await this.read()}`;
    }

    /** Presses one key (trusted keyboard events, as from a person). */
    private async key(press: KeyPress): Promise<void> {
        const { connection, sessionId } = await this.active();
        const base = { key: press.key, code: press.code, windowsVirtualKeyCode: press.keyCode, nativeVirtualKeyCode: press.keyCode, modifiers: press.modifiers };
        await connection.send('Input.dispatchKeyEvent', { ...base, type: press.text ? 'keyDown' : 'rawKeyDown', ...(press.text ? { text: press.text, unmodifiedText: press.text } : {}), ...(press.commands ? { commands: press.commands } : {}) }, sessionId);
        await connection.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' }, sessionId);
    }

    /** Presses a key or shortcut (optionally repeatedly), then reads the page. */
    public async pressKeys(keys: string, times = 1): Promise<string> {
        const press = parseKeyPress(keys);
        const { connection } = await this.active();
        const before = await this.tabIds(connection);
        const count = Math.max(1, Math.min(MAX_KEY_REPEAT, Math.round(times)));
        for (let index = 0; index < count; index++) await this.key(press);
        await delay(HOVER_SETTLE_MS);
        const followed = await this.followNewTab(connection, before);
        return `Pressed ${keys}${count > 1 ? ` ${count} times` : ''}.\n${followed}\n${await this.read()}`;
    }

    /**
     * Types text like a person: into a numbered element (its content is replaced unless `replace` is false) or, without
     * a ref, at the caret of the focused element. Works in plain fields and rich-text editors (also in shadow DOM);
     * selects, checkboxes and special inputs are set to the given value. Secret fields are never recorded.
     */
    public async type(input: { ref?: number; text: string; replace?: boolean; submit?: boolean }): Promise<string> {
        const { connection, sessionId } = await this.active();
        const { ref, text } = input;
        const target = await this.evaluate<EntryTarget>(entryTargetScript(ref));
        if (target.missing) throw staleReference(ref!);
        if (target.kind === 'file') throw new PtbkError(`[${ref}] is a file input; attach files with browser_upload.`, { kind: 'usage' });
        if (target.kind === 'value' && ref !== undefined) {
            const set = await this.evaluate<{ error?: string; content?: string }>(setValueScript(ref, text));
            if (set.error) throw set.error === 'missing' ? staleReference(ref) : new PtbkError(set.error, { kind: 'usage' });
            if (input.submit && !(await this.evaluate<boolean>(submitFormScript(ref)))) await this.key(parseKeyPress('Enter'));
            await delay(input.submit ? SUBMIT_SETTLE_MS : TYPE_SETTLE_MS);
            return `Set [${ref}] ${target.description ?? ''} to ${JSON.stringify(set.content ?? text)}.\n\n${await this.read()}`;
        }
        const replace = input.replace ?? ref !== undefined;
        if (ref !== undefined) {
            // A person clicks into the field first (editors set up their state on it); then the caret is placed exactly.
            if (!target.focused && target.visible && !target.covered && target.x !== undefined && target.y !== undefined) await this.mouse({ x: target.x, y: target.y }, {});
            if (!(await this.evaluate<boolean>(focusForEntryScript(ref, replace)))) throw staleReference(ref);
        } else if (replace) await this.evaluate<boolean>(focusForEntryScript(undefined, true));
        if (target.secret) await this.recorder.pause('secret entry into a password/one-time-code field (not recorded)');
        try {
            if (replace && !text) await this.key(parseKeyPress('Backspace'));
            const lines = target.singleLine ? [text] : text.split(/\r?\n/);
            for (const [index, line] of lines.entries()) {
                if (index > 0) await this.key(parseKeyPress('Enter'));
                if (line) await connection.send('Input.insertText', { text: line }, sessionId);
            }
            if (input.submit && !(await this.evaluate<boolean>(submitFormScript(ref)))) await this.key(parseKeyPress('Enter'));
        } finally {
            if (target.secret) {
                await delay(SUBMIT_SETTLE_MS);
                await this.recorder.resume();
            }
        }
        await delay(input.submit ? SUBMIT_SETTLE_MS : TYPE_SETTLE_MS);
        const into = ref !== undefined ? `[${ref}] ` : '';
        if (input.submit) return `Typed into ${into}${target.description ?? 'the focused element'} and submitted.\n\n${await this.read()}`;
        const after = await this.evaluate<{ description: string; content: string } | undefined>(entryContentScript(ref));
        return `Typed into ${into}${after?.description ?? target.description ?? 'the focused element'}. Its content is now:\n${after?.content ?? '(unknown)'}\n\n${await this.read()}`;
    }

    /** Attaches files to a file input, or to the file chooser that clicking an element opens. */
    public async upload(ref: number, files: readonly string[]): Promise<string> {
        if (!files.length) throw new PtbkError('Name at least one file to upload.', { kind: 'usage' });
        const paths = files.map((file) => (isAbsolute(file) ? file : resolve(this.project.root, file)));
        for (const path of paths) if (!(await pathExists(path))) throw new PtbkError(`The file ${path} does not exist (relative paths are relative to the project).`, { kind: 'usage' });
        const { connection, sessionId } = await this.active();
        const fileInput = await this.evaluate<boolean | null>(isFileInputScript(ref));
        if (fileInput === null) throw staleReference(ref);
        if (fileInput) {
            const element = await connection.send('Runtime.evaluate', { expression: elementObjectScript(ref) }, sessionId);
            const objectId = (element.result as { objectId?: string } | undefined)?.objectId;
            if (!objectId) throw staleReference(ref);
            await connection.send('DOM.setFileInputFiles', { files: paths, objectId }, sessionId);
        } else {
            await connection.send('Page.setInterceptFileChooserDialog', { enabled: true }, sessionId);
            try {
                const chooser = connection.waitFor('Page.fileChooserOpened', 10_000, sessionId);
                await this.clickAt({ ref }, {});
                const opened = await chooser;
                if (typeof opened?.backendNodeId !== 'number') throw new PtbkError(`Clicking [${ref}] did not open a file chooser; give the file input or the button that opens the chooser.`, { kind: 'usage' });
                await connection.send('DOM.setFileInputFiles', { files: paths, backendNodeId: opened.backendNodeId }, sessionId);
            } finally {
                await connection.send('Page.setInterceptFileChooserDialog', { enabled: false }, sessionId).catch(() => undefined);
            }
        }
        await delay(ACTION_SETTLE_MS);
        return `Attached ${paths.map((path) => basename(path)).join(', ')} to [${ref}].\n\n${await this.read()}`;
    }

    /** Runs JavaScript in the current page (top-level `await` allowed) and returns its JSON value or text. */
    public async runScript(script: string): Promise<string> {
        if (!script.trim()) throw new PtbkError('Give the JavaScript to run.', { kind: 'usage' });
        const { connection, sessionId } = await this.active();
        const result = await withTimeout(connection.send('Runtime.evaluate', { expression: script, returnByValue: true, awaitPromise: true, userGesture: true, replMode: true }, sessionId), SCRIPT_TIMEOUT_MS, 'The script');
        const failure = result.exceptionDetails as { text?: string; exception?: { description?: string } } | undefined;
        if (failure) throw new PtbkError(`The script failed: ${failure.exception?.description ?? failure.text ?? 'exception'}`, { kind: 'usage' });
        const value = result.result as { type: string; value?: unknown; unserializableValue?: string; description?: string };
        const text = value.type === 'undefined' ? 'undefined' : value.unserializableValue ?? ('value' in value ? (typeof value.value === 'string' ? value.value : JSON.stringify(value.value, null, 2)) : (value.description ?? value.type));
        return truncate(String(text), MAX_PAGE_TEXT);
    }

    /** Sends any Chrome DevTools Protocol command to the current page or to the browser and returns its result. */
    public async protocol(method: string, params: Readonly<Record<string, unknown>>, scope: 'page' | 'browser'): Promise<string> {
        if (!/^[A-Z][A-Za-z]*\.[a-z][A-Za-z]*$/.test(method.trim())) throw new PtbkError('Name a DevTools protocol method such as Page.printToPDF or Emulation.setGeolocationOverride.', { kind: 'usage' });
        const { connection, sessionId } = await this.active();
        const result = await withTimeout(connection.send(method.trim(), { ...params }, scope === 'browser' ? undefined : sessionId), SCRIPT_TIMEOUT_MS, method);
        return truncate(JSON.stringify(result, null, 2), MAX_PAGE_TEXT);
    }

    /** The local DevTools endpoint of the running browser for the agent's own automation scripts. */
    public async devtoolsEndpoint(): Promise<string> {
        await this.active();
        const devtools = this.devtools;
        if (!devtools) throw new PtbkError(`The browser "${this.name}" exposes no DevTools endpoint right now; try again.`, { kind: 'technical' });
        const http = `http://127.0.0.1:${devtools.port}`;
        return [
            `HTTP endpoint: ${http}`,
            `WebSocket endpoint: ${devtools.webSocket}`,
            `Tab you work in: ${this.targetId ?? '(none)'}`,
            '',
            `Use it from your own scripts while this task holds the browser, for example Playwright \`chromium.connectOverCDP("${http}")\` (its existing context, browser.contexts()[0], carries the profile's sessions) or Puppeteer \`puppeteer.connect({ browserWSEndpoint: "${devtools.webSocket}" })\`. Disconnect when done; do not close the browser (Promptbook owns the process and releases the profile after the task). The endpoint changes when the browser restarts.`,
        ].join('\n');
    }

    /** Captures the viewport (or the full page) as PNG into ignored runtime storage; the image is also returned. */
    public async screenshot(fullPage = false): Promise<{ path: string; data: string; summary: string }> {
        const { connection, sessionId } = await this.active();
        const view = await this.evaluate<Viewport>(viewportScript());
        const height = Math.min(view.pageHeight, MAX_SCREENSHOT_HEIGHT);
        const result = await connection.send('Page.captureScreenshot', fullPage ? { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: view.pageWidth, height, scale: 1 } } : { format: 'png' }, sessionId);
        const data = String(result.data);
        const image = Buffer.from(data, 'base64');
        const directory = await ensureDirectory(join(this.project.runtime.temporary, 'screenshots'));
        const path = join(directory, `${shortId()}.png`);
        await writeFile(path, image);
        const width = image.length > 24 ? image.readUInt32BE(16) : 0;
        const scale = width && !fullPage ? width / view.width : 1;
        const coordinates = fullPage
            ? `the full page, ${view.pageWidth}×${height} CSS pixels${height < view.pageHeight ? ` (cut from ${view.pageHeight})` : ''}; positions are page positions, scroll before clicking`
            : `the viewport, ${view.width}×${view.height} CSS pixels, scrolled to (${Math.round(view.scrollX)}, ${Math.round(view.scrollY)}); ${Math.abs(scale - 1) < 0.01 ? 'image pixels are the x/y of browser_click' : `divide image pixels by ${scale.toFixed(2)} for the x/y of browser_click`}`;
        return { path, data, summary: `Screenshot of ${coordinates}.\nSaved as ${path}` };
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
        this.targetId = undefined;
        this.devtools = undefined;
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
