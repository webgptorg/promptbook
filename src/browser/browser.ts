import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, readlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { isProcessAlive, terminateProcessTree, which } from '../common/process.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { BridgeTool } from '../engine/bridge.js';
import type { RequestStore, UserRequest } from '../engine/requests.js';
import type { TaskTrace } from '../engine/task-trace.js';
import { BrowserRecorder, cleanStaleRecordings, type ScreencastPort } from './recording.js';

/**
 * Maximal page text returned to an agent.
 */
const MAX_PAGE_TEXT = 20_000;

/**
 * How long Chrome may take to expose its DevTools endpoint.
 */
const STARTUP_TIMEOUT_MS = 30_000;

/**
 * Candidate Chrome-compatible executables per platform.
 */
function chromeCandidates(): string[] {
    if (process.platform === 'darwin') {
        return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'];
    }
    if (process.platform === 'win32') {
        const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean) as string[];
        return roots.flatMap((root) => [join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), join(root, 'Chromium', 'Application', 'chrome.exe')]);
    }
    return [];
}

/**
 * Locates a Chrome-compatible browser (configuration, `CHROME_PATH`, standard locations, PATH).
 *
 * @private project browser
 */
export async function findBrowserExecutable(settings: EffectiveSettings, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const configured = setting<string | undefined>(settings, 'browser.executable') ?? env.CHROME_PATH;
    if (configured) return (await pathExists(configured)) ? configured : await which(configured, env);
    for (const candidate of chromeCandidates()) if (await pathExists(candidate)) return candidate;
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge']) {
        const found = await which(name, env);
        if (found) return found;
    }
    return undefined;
}

/**
 * Resolves the profile directory: the isolated project profile in `.ptbk/` or an explicitly selected path.
 *
 * @private project browser
 */
export function browserProfileDirectory(project: Project, settings: EffectiveSettings): string {
    const profile = setting<string>(settings, 'browser.profile');
    return profile === 'isolated' ? project.runtime.browserProfile : profile;
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

    /** Closes the socket. */
    public close(): void {
        this.socket.close();
    }
}

/**
 * The project's single shared browser instance (one profile, one automation owner at a time).
 *
 * @private project browser
 */
export class ProjectBrowser {
    private child?: ChildProcess;
    private connection?: CdpConnection;
    private sessionId?: string;
    private note?: string;
    /** Task-linked recording of browser activity (`traces/<task-id>/video/`). */
    public readonly recorder: BrowserRecorder;

    public constructor(
        private readonly project: Project,
        private readonly settings: () => EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
    ) {
        this.recorder = new BrowserRecorder(project, () => setting<boolean>(this.settings(), 'traces.recordVideo'), env);
        void cleanStaleRecordings(project);
    }

    /** Associates subsequent browser use with a task attempt for recording. */
    public async useFor(trace: TaskTrace, attempt: string): Promise<void> {
        await this.recorder.attach(trace, attempt);
    }

    /** Unsubscribes the page-transition listener of the current connection. */
    private navigationListener?: () => void;

    /** Ensures the browser runs and recording of the attached task has begun. */
    private async active(): Promise<{ connection: CdpConnection; sessionId: string }> {
        const target = await this.ensure();
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

    /** Launches (or reuses) the browser and attaches to one page. */
    private async ensure(): Promise<{ connection: CdpConnection; sessionId: string }> {
        if (this.connection && this.sessionId) return { connection: this.connection, sessionId: this.sessionId };
        const settings = this.settings();
        const executable = await findBrowserExecutable(settings, this.env);
        if (!executable) throw new PtbkError('No Chrome-compatible browser is installed.', { kind: 'setup', next: ['Install Google Chrome or Chromium, or set ptbk.json browser.executable.'] });
        const profile = browserProfileDirectory(this.project, settings);
        await ensureDirectory(profile);
        let owner = await profileOwner(profile);
        // Ownership is often transient (a browser still shutting down): recheck briefly before involving a person.
        for (let attempt = 0; owner && attempt < 10; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            owner = await profileOwner(profile);
        }
        if (owner) {
            throw new PtbkError(`The browser profile ${profile} is in use by another browser (PID ${owner}).`, {
                kind: 'conflict',
                next: ['Close that browser to hand the profile over, or choose another profile (ptbk.json browser.profile).'],
            });
        }
        let headless = setting<string>(settings, 'browser.mode') !== 'headful';
        if (!headless && !hasDisplay(this.env)) {
            headless = true;
            this.note = 'No display is available on this host, so the browser runs headless (no window was shown).';
        }
        const activePortFile = join(profile, 'DevToolsActivePort');
        await writeFile(activePortFile, '').catch(() => undefined);
        const args = [`--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', ...(headless ? ['--headless=new'] : []), 'about:blank'];
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
        if (this.child) terminateProcessTree(this.child);
        this.child = undefined;
    }
}

/**
 * Browser tools exposed to agents through the ptbk MCP bridge.
 *
 * @private project browser
 */
export function browserTools(browser: ProjectBrowser, requests: RequestStore, task: { ref: string; id?: string; title: string; agent?: string }, onUserRequest: (request: UserRequest) => void): BridgeTool[] {
    const run = async (action: () => Promise<string>): Promise<{ text: string; isError?: boolean }> => {
        try {
            return { text: await action() };
        } catch (error) {
            return { text: errorMessage(error), isError: true };
        }
    };
    return [
        {
            name: 'browser_open',
            description: "Open a URL in the project's shared browser (persistent logged-in sessions) and return the page text and interactive elements.",
            inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
            handler: (input) => run(() => browser.open(String(input.url ?? ''))),
        },
        {
            name: 'browser_read',
            description: 'Return the text and numbered interactive elements of the current page.',
            inputSchema: { type: 'object', properties: {} },
            handler: () => run(() => browser.read()),
        },
        {
            name: 'browser_click',
            description: 'Click an interactive element by its number from browser_read.',
            inputSchema: { type: 'object', properties: { ref: { type: 'number' } }, required: ['ref'] },
            handler: (input) => run(() => browser.click(Number(input.ref))),
        },
        {
            name: 'browser_type',
            description: 'Type text into an input by its number from browser_read; optionally submit the form.',
            inputSchema: { type: 'object', properties: { ref: { type: 'number' }, text: { type: 'string' }, submit: { type: 'boolean' } }, required: ['ref', 'text'] },
            handler: (input) => run(() => browser.type(Number(input.ref), String(input.text ?? ''), input.submit === true)),
        },
        {
            name: 'browser_screenshot',
            description: 'Save a screenshot of the current page and return its file path.',
            inputSchema: { type: 'object', properties: {} },
            handler: () => run(() => browser.screenshot()),
        },
        {
            name: 'browser_request_user_action',
            description: 'Only when a website genuinely requires a human-only step (sign-in, two-factor authentication, consent) that the existing session cannot satisfy: ask the human to act in the shared browser. Then end your turn with status waiting-for-user.',
            inputSchema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
            handler: (input) =>
                run(async () => {
                    const note = await browser.bringToFront();
                    const request = await requests.create({
                        kind: 'action',
                        reason: String(input.reason ?? 'A website needs your action in the project browser.'),
                        question: `Complete the action in the project browser${note ? ` (${note})` : ''}, then confirm.`,
                        attempted: 'The task used the existing session of the shared project browser; the website still requires this human-only step.',
                        choices: ['Done', 'I cannot do it'],
                        origin: { kind: 'browser', taskRef: task.ref, taskId: task.id, taskTitle: task.title, agent: task.agent },
                        blocking: true,
                    });
                    onUserRequest(request);
                    return `Created user request ${request.id}. End your turn now with status waiting-for-user.`;
                }),
        },
    ];
}
