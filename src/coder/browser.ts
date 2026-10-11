import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { access, lstat, mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import type { Workspace } from './domain.js';
import type { BridgeTool } from './team.js';
import { confinePath, InputError } from './workspace.js';
import { createRequest, waitForAnswer } from './requests.js';

/** Browser presentation and persistent profile configuration, shared across project tasks. @private */
export interface BrowserOptions { mode?: 'headless' | 'headful'; profile?: string; executable?: string; signal?: AbortSignal; }
/** Sensitive browser metadata stays separate from model-facing page context. @private */
export interface BrowserStatus { mode: 'headless' | 'headful'; profile: string; running: boolean; executable?: string; }
/** A DevTools target describes one tab rather than its cookies or private browser state. */
interface BrowserTarget { id: string; type: string; url: string; title: string; webSocketDebuggerUrl?: string; }

/** Execute fixed, read-only Git inventory commands without exposing profile file contents. */
const execute = promisify(execFile);

/** Check whether this host can display a real browser window. @private */
export function desktopAvailable(): boolean { return process.platform === 'darwin' || process.platform === 'win32' || !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY); }

/** Find an installed Chrome-compatible executable without downloading or launching anything. @private */
export async function discoverBrowserExecutable(explicit?: string): Promise<string> {
    const candidates = explicit ? [explicit] : [process.env.PTBK_BROWSER_EXECUTABLE, ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'] : process.platform === 'win32' ? [resolve(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), resolve(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe')] : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'])].filter((entry): entry is string => !!entry);
    for (const candidate of candidates) { try { await access(candidate); return await realpath(candidate); } catch { /* Try next installed browser. */ } }
    throw new InputError('No Chrome-compatible browser found. Install Chrome/Chromium or set PTBK_BROWSER_EXECUTABLE; no browser session was created.');
}

/** Send one bounded CDP request; never expose cookie, network-header or storage APIs. */
async function devtools(url: string, method: string, params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
    return new Promise((accept, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => { cleanup(); reject(new Error(`Browser ${method} timed out`)); }, 15_000);
        const cancel = () => { cleanup(); reject(new Error('Browser operation cancelled')); };
        /** Release only the connection created for this operation. */
        function cleanup(): void { clearTimeout(timer); signal?.removeEventListener('abort', cancel); socket.close(); }
        signal?.addEventListener('abort', cancel, { once: true });
        socket.addEventListener('open', () => { if (signal?.aborted) cancel(); else socket.send(JSON.stringify({ id: 1, method, params })); });
        socket.addEventListener('error', () => { cleanup(); reject(new Error(`Browser DevTools connection failed for ${method}`)); });
        socket.addEventListener('close', () => { cleanup(); if (method === 'Browser.close') accept({}); else reject(new Error(`Browser DevTools connection closed during ${method}`)); });
        socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown>; error?: { message: string } };
                if (message.id !== 1) return;
                cleanup(); if (message.error) reject(new Error(message.error.message)); else accept(message.result || {});
            } catch (error) { cleanup(); reject(error); }
        });
    });
}

/** One project-owned browser; profile and site sessions survive stop/restart and mode changes. @private */
export class ProjectBrowser {
    private child?: ChildProcess;
    private endpoint?: string;
    private browserSocket?: string;
    private profilePath?: string;
    private executable?: string;
    private mode: 'headless' | 'headful';
    private pending: Promise<unknown> = Promise.resolve();
    private leasePath?: string;
    private leaseOwned = false;
    private readonly tabAliases = new Map<string, string>();
    constructor(private readonly workspace: Workspace, private readonly options: BrowserOptions = {}) { this.mode = options.mode || 'headless'; }

    /** Present configuration without launching a browser or inspecting session secrets. */
    status(): BrowserStatus { return { mode: this.mode, profile: this.profilePath || resolve(this.workspace.projectPath, this.options.profile || '.ptbk/browser/profile'), running: !!this.endpoint && !!this.child && this.child.exitCode === null && this.child.signalCode === null, ...(this.executable ? { executable: this.executable } : {}) }; }

    /** Serialize browser control across primary agents, advisors and human handover. */
    private exclusive<T>(operation: () => Promise<T>): Promise<T> {
        const task = this.pending.then(operation, operation); this.pending = task.then(() => undefined, () => undefined); return task;
    }

    /** Acquire the profile for this owned Chrome instance without commandeering an existing browser. */
    private async launch(): Promise<void> {
        if (this.endpoint && this.child?.exitCode === null && this.child.signalCode === null) return;
        if (this.leaseOwned) await this.closeOwned();
        if (this.mode === 'headful' && !desktopAvailable()) throw new InputError('Headful browser requested on a host without a desktop; no login window was displayed. Use headless mode or a desktop host.');
        this.executable ||= await discoverBrowserExecutable(this.options.executable);
        this.profilePath = this.options.profile ? resolve(this.workspace.projectPath, this.options.profile) : await confinePath(this.workspace.projectPath, resolve(this.workspace.statePath, 'browser/profile'));
        if (this.options.profile) {
            try { this.profilePath = await realpath(this.profilePath); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new InputError(`Explicit browser profile does not exist: ${this.profilePath}`); throw error; }
            await this.assertPrivateProfile();
        } else await mkdir(this.profilePath, { recursive: true, mode: 0o700 });
        for (const name of ['SingletonLock', 'SingletonSocket', 'lockfile']) {
            try {
                await lstat(resolve(this.profilePath, name));
                const handover = await createRequest(this.workspace, { kind: 'action', reason: 'The selected persistent browser profile belongs to an existing browser instance.', prompt: `Close the Chrome instance using ${this.profilePath} when it is safe, then answer this request. Promptbook will retain its sessions and launch its own browser; it will not attach to or terminate your existing browser.` });
                throw new InputError(`Browser profile is already in use: ${this.profilePath}. Safe handover request ${handover.id} is pending; ptbk will not attach to or terminate it.`);
            }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        const directory = await confinePath(this.workspace.projectPath, resolve(this.workspace.statePath, 'browser'));
        await mkdir(directory, { recursive: true, mode: 0o700 });
        this.leasePath = resolve(directory, 'lease.json');
        try { await writeFile(this.leasePath, JSON.stringify({ pid: process.pid, profile: this.profilePath }), { flag: 'wx', mode: 0o600 }); }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            const previous = JSON.parse(await readFile(this.leasePath, 'utf8')) as { pid: number };
            try { process.kill(previous.pid, 0); throw new InputError(`The project browser is already owned by PID ${previous.pid}.`); }
            catch (aliveError) { if ((aliveError as NodeJS.ErrnoException).code !== 'ESRCH') throw aliveError; }
            await unlink(this.leasePath);
            await writeFile(this.leasePath, JSON.stringify({ pid: process.pid, profile: this.profilePath }), { flag: 'wx', mode: 0o600 });
        }
        this.leaseOwned = true;
        const portFile = resolve(this.profilePath, 'DevToolsActivePort');
        await unlink(portFile).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
        this.child = spawn(this.executable, [`--user-data-dir=${this.profilePath}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--restore-last-session', ...(this.mode === 'headless' ? ['--headless=new'] : [])], { stdio: 'ignore', shell: false });
        let failure: Error | undefined;
        this.child.once('error', (error) => { failure = error; });
        const deadline = Date.now() + 20_000;
        try {
            while (Date.now() < deadline) {
                if (this.options.signal?.aborted) throw new Error('Browser startup cancelled');
                if (failure || this.child.exitCode !== null) throw failure || new Error(`Chrome exited during startup (${this.child.exitCode})`);
                try {
                    const [port, socket] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/);
                    if (/^\d+$/.test(port || '') && socket?.startsWith('/devtools/browser/')) { this.endpoint = `http://127.0.0.1:${port}`; this.browserSocket = `ws://127.0.0.1:${port}${socket}`; return; }
                } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
                await delay(100, undefined, { signal: this.options.signal });
            }
            throw new Error('Chrome did not expose its loopback DevTools endpoint within 20 seconds');
        } catch (error) { await this.closeOwned(); throw error; }
    }

    /** Refuse explicit profiles whose private session files could enter this checkout's commits. */
    private async assertPrivateProfile(): Promise<void> {
        if (!this.workspace.gitRoot || !this.profilePath) return;
        const root = await realpath(this.workspace.gitRoot);
        const path = relative(root, this.profilePath);
        if (isAbsolute(path) || path === '..' || path.startsWith('../') || path.startsWith('..\\')) return;
        let ignored = false;
        let tracked = true;
        try {
            const listing = await execute('git', ['-C', root, 'ls-files', '--cached', '--', this.profilePath], { timeout: 10_000, maxBuffer: 1024 * 1024 });
            tracked = !!listing.stdout.trim();
            await execute('git', ['-C', root, 'check-ignore', '--quiet', '--', this.profilePath], { timeout: 10_000 });
            ignored = true;
        } catch { /* Unknown inventory or unignored storage is never suitable for private sessions. */ }
        if (ignored && !tracked) return;
        const request = await createRequest(this.workspace, {
            kind: 'action', reason: 'The selected browser profile is inside a Git checkout and its private session files are not safely excluded from commits.',
            prompt: `Move the profile ${this.profilePath} outside the checkout, or ignore the entire directory and safely remove any tracked profile files from Git. Preserve its browser sessions, then retry. The profile has not been opened or modified.`,
        });
        throw new InputError(`Browser profile must remain outside Git history. Move it outside the checkout or ignore its entire directory and remove tracked profile files. Action request ${request.id} is pending.`);
    }

    /** List project tabs through loopback metadata without session cookie or header inspection. */
    private async targets(): Promise<BrowserTarget[]> { await this.launch(); const response = await fetch(`${this.endpoint}/json/list`, { signal: AbortSignal.timeout(10_000) }); if (!response.ok) throw new Error('Cannot list project browser tabs'); return await response.json() as BrowserTarget[]; }

    /** Resolve a tab explicitly or the first normal page; never select another browser instance. */
    private async target(id?: string): Promise<BrowserTarget> {
        const targets = (await this.targets()).filter((target) => target.type === 'page');
        const target = id ? targets.find((target) => target.id === id) || targets.find((target) => target.url === this.tabAliases.get(id)) : targets[0];
        if (!target?.webSocketDebuggerUrl) throw new InputError(`Project browser tab ${id || '(first page)'} is unavailable`);
        this.tabAliases.set(target.id, target.url);
        return target;
    }

    /** Navigate real external project context while rejecting dangerous browser-internal schemes. */
    async navigate(url: string): Promise<string> { return this.exclusive(async () => { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new InputError('Browser navigation requires HTTP(S) without embedded credentials'); await this.launch(); const result = await devtools(this.browserSocket!, 'Target.createTarget', { url: parsed.href }, this.options.signal); const id = String(result.targetId); this.tabAliases.set(id, parsed.href); return id; }); }

    /** Read rendered text and controls while suppressing passwords, secret values and hidden storage. */
    async readPage(id?: string): Promise<string> { return this.exclusive(async () => { const target = await this.target(id); const result = await devtools(target.webSocketDebuggerUrl!, 'Runtime.evaluate', { expression: `JSON.stringify({url:location.origin+location.pathname,title:document.title,text:document.body.innerText.slice(0,96000),controls:Array.from(document.querySelectorAll('a,button,input,textarea,select')).filter(e=>e.type!=='password').slice(0,200).map(e=>({tag:e.tagName,label:e.innerText||e.getAttribute('aria-label')||e.getAttribute('placeholder')||'',id:e.id}))})`, returnByValue: true }, this.options.signal); return String((result.result as { value?: unknown } | undefined)?.value || 'No rendered context'); }); }

    /** Click one explicit selector; the single project browser serializes all callers. */
    async click(selector: string, id?: string): Promise<string> { return this.exclusive(async () => { const target = await this.target(id); const result = await devtools(target.webSocketDebuggerUrl!, 'Runtime.evaluate', { expression: `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return 'Selector missing';e.click();return 'Clicked';})()`, returnByValue: true }, this.options.signal); return String((result.result as { value?: unknown } | undefined)?.value); }); }

    /** Fill ordinary controls; password entry always stays with the human in the actual browser. */
    async fill(selector: string, value: string, id?: string): Promise<string> { return this.exclusive(async () => { const target = await this.target(id); const result = await devtools(target.webSocketDebuggerUrl!, 'Runtime.evaluate', { expression: `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return 'Selector missing';if(e.type==='password')return 'Password entry requires human action';e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return 'Filled';})()`, returnByValue: true }, this.options.signal); return String((result.result as { value?: unknown } | undefined)?.value); }); }

    /** Switch visibility by safely restarting only owned Chrome with the same persistent profile. */
    async setMode(mode: 'headless' | 'headful'): Promise<BrowserStatus> { return this.exclusive(async () => { if (!['headless', 'headful'].includes(mode)) throw new InputError('Browser mode must be headless or headful'); if (mode === 'headful' && !desktopAvailable()) throw new InputError('No desktop is available; a login window cannot be displayed on this host'); const running = !!this.child; if (mode !== this.mode) { if (running) for (const target of await this.targets()) this.tabAliases.set(target.id, target.url); await this.closeOwned(); this.mode = mode; if (running) await this.launch(); } return this.status(); }); }

    /** Foreground a real login/action window or truthfully report that this host cannot display one. */
    async requestHuman(prompt: string, taskId?: string, activityId?: string): Promise<string> {
        return this.exclusive(async () => {
            let presentation = 'This host has no desktop. Continue from a desktop host using the selected profile; no browser window was displayed.';
            if (desktopAvailable()) {
                if (this.mode !== 'headful') { if (this.child) for (const target of await this.targets()) this.tabAliases.set(target.id, target.url); await this.closeOwned(); this.mode = 'headful'; }
                const target = await this.target();
                await devtools(target.webSocketDebuggerUrl!, 'Page.bringToFront');
                presentation = 'The project browser is visible. Perform the action on the real site, then answer the request.';
            }
            const request = await createRequest(this.workspace, { kind: 'action', taskId, activityId, reason: 'The active task needs human intervention in the shared project browser.', prompt: `${prompt}\n${presentation}` });
            return waitForAnswer(this.workspace, request.id, this.options.signal);
        });
    }

    /** Stop only the owned browser and retain its persistent profile and authenticated sessions. */
    private async closeOwned(): Promise<void> {
        const child = this.child;
        const socket = this.browserSocket;
        this.child = undefined; this.endpoint = undefined; this.browserSocket = undefined;
        if (child?.pid && child.exitCode === null && child.signalCode === null) {
            if (socket) await devtools(socket, 'Browser.close').catch(() => this.terminateOwned(child, false));
            else await this.terminateOwned(child, false);
            if (child.exitCode === null && child.signalCode === null) await Promise.race([new Promise<void>((accept) => child.once('exit', () => accept())), delay(3000)]);
            if (child.exitCode === null && child.signalCode === null) {
                await this.terminateOwned(child, true);
                if (child.exitCode === null && child.signalCode === null) await new Promise<void>((accept) => child.once('exit', () => accept()));
            }
        }
        if (this.leasePath && this.leaseOwned) { await unlink(this.leasePath).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); this.leasePath = undefined; this.leaseOwned = false; }
    }

    /** Target only the PID tree spawned by this project when native graceful shutdown fails. */
    private async terminateOwned(child: ChildProcess, force: boolean): Promise<void> {
        if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
        if (process.platform === 'win32') await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { timeout: 10_000 }).catch(() => { child.kill('SIGKILL'); });
        else child.kill(force ? 'SIGKILL' : 'SIGTERM');
    }

    /** Release automation at process stop without deleting user sessions. */
    async close(): Promise<void> { await this.exclusive(() => this.closeOwned()); }
}

/** Expose bounded real browser operations to the active task's provider bridge. @private */
export function browserTools(browser: ProjectBrowser, taskId?: string, activityId?: () => string | undefined): BridgeTool[] {
    const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
    return [
        { name: 'browser_navigate', readOnly: false, description: 'Open external project context in the shared persistent browser. Returns tab ID.', inputSchema: schema({ url: { type: 'string' } }, ['url']), invoke: async (input) => browser.navigate(String(input.url || '')) },
        { name: 'browser_read_page', readOnly: true, description: 'Read the rendered page and ordinary controls; never reads passwords/cookies/session storage.', inputSchema: schema({ tab: { type: 'string' } }), invoke: async (input) => browser.readPage(typeof input.tab === 'string' ? input.tab : undefined) },
        { name: 'browser_click', readOnly: false, description: 'Click one CSS selector in a shared project browser tab.', inputSchema: schema({ selector: { type: 'string' }, tab: { type: 'string' } }, ['selector']), invoke: async (input) => browser.click(String(input.selector || ''), typeof input.tab === 'string' ? input.tab : undefined) },
        { name: 'browser_fill', readOnly: false, description: 'Fill an ordinary field. Password entry requires human action in the real browser.', inputSchema: schema({ selector: { type: 'string' }, value: { type: 'string' }, tab: { type: 'string' } }, ['selector', 'value']), invoke: async (input) => browser.fill(String(input.selector || ''), String(input.value || ''), typeof input.tab === 'string' ? input.tab : undefined) },
        { name: 'browser_request_human', readOnly: false, description: 'Request login, two-factor authentication or a human action on the actual site and await the durable answer.', inputSchema: schema({ prompt: { type: 'string' } }, ['prompt']), invoke: async (input) => browser.requestHuman(String(input.prompt || ''), taskId, activityId?.()) },
    ];
}
