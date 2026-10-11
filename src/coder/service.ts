import { createServer as createSocketServer, connect } from 'node:net';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, open, chmod, stat, lstat, rename, rmdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { hostname, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import QRCode from 'qrcode';
import type { Workspace, TaskDefinition, EligibilityResult, OccurrenceState } from './domain.js';
import { atomicWrite, acquireLease, readLedger, listRecovery, processBirth } from './state.js';
import { runQueue, recoverTask, validateRunOptions, type RunOptions, type RunResult, type EngineEvent } from './engine.js';
import { discoverTasks, serializeTaskBook, assignTaskId, updateTaskControls, checksum, assertConfined } from './sources.js';
import { evaluateEligibility } from './schedule.js';
import { captureSnapshot, commitScoped } from './git.js';
import { confinePath, InputError, readContext, resolveAgentSelection } from './workspace.js';
import { discoverAgents, ensureCoreAgents } from './agents.js';
import { inspectHarnesses, type HarnessInventory } from './setup.js';
import { getHarness, loadProjectSecrets, redactSecrets } from './harness.js';
import { createRequest, listRequests, answerRequest } from './requests.js';
import { installStartup, disableStartup, type StartupPaths } from './persistence.js';
import { createTerminal } from './terminal.js';
import { ProjectBrowser, browserTools } from './browser.js';

/** Supervisor settings supplement finite options without changing task authority. @private */
export interface ServiceOptions extends RunOptions {
    mode?: 'daemon' | 'raw' | 'interactive'; noPersist?: boolean; noServer?: boolean; noQr?: boolean; port?: number;
    browserMode?: 'headless' | 'headful'; browserProfile?: string; enabledHarnesses?: string[];
    automatic?: boolean; onReady?: (record: ServiceRecord) => void;
    inspectHarnesses?: typeof inspectHarnesses;
}
/** A versioned process record is verified through its authenticated local control endpoint. @private */
export interface ServiceRecord {
    version: 1; id: string; pid: number; ownerId?: string; project: string; installation: string; node: string; endpoint: string; token: string;
    mode: 'daemon' | 'raw' | 'interactive'; desired: 'running' | 'stopped'; startedAt: number; updatedAt: number;
    url?: string; persistent: boolean; settings: ServiceOptions; status: string; error?: string;
}
/** One shared control model drives terminal, socket CLI and localhost HTTP. @private */
export interface RuntimeControl {
    snapshot(): Promise<Record<string, unknown>>;
    command(action: string, input?: Record<string, unknown>): Promise<unknown>;
    token: string;
}
/** Settings that require process restart are identified before applying them. */
const STARTUP_SETTINGS = new Set(['mode', 'port', 'noServer', 'noPersist', 'browserProfile']);
/** Adjustable finite behavior remains discoverable through every shared control snapshot. */
const LIVE_SETTINGS = new Set(['harness', 'model', 'thinkingLevel', 'agent', 'context', 'enabledHarnesses', 'browserMode', 'check', 'checkBefore', 'gitChanges', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings', 'noQuestions', 'allowCredits', 'preserveLogs', 'waitBetweenPrompts', 'waitAfterPrompt', 'waitAfterError', 'minPriority', 'maxPriority']);

/** Strip functions/signals and private callbacks before persisting restart configuration. */
function serialSettings(options: ServiceOptions): ServiceOptions {
    return JSON.parse(JSON.stringify(options, (_key, value) => typeof value === 'function' || value instanceof AbortSignal ? undefined : value)) as ServiceOptions;
}
/** Keep Unix socket names within the platform limit even for deeply nested projects. */
function socketDirectory(): string {
    const uid = process.getuid?.();
    if (uid === undefined) throw new InputError('Unix control sockets require a current-user identity.');
    const candidate = join(process.platform === 'darwin' ? '/tmp' : tmpdir(), `ptbk-${uid}`);
    return Buffer.byteLength(join(candidate, `${'x'.repeat(24)}.sock`)) < 100 ? candidate : join('/tmp', `ptbk-${uid}`);
}
/** Validate a private current-user directory before connecting, creating or removing sockets. */
async function prepareSocketDirectory(create: boolean): Promise<void> {
    if (process.platform === 'win32') return;
    const directory = socketDirectory();
    if (create) await mkdir(directory, { mode: 0o700 }).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
    let attributes;
    try { attributes = await lstat(directory); }
    catch (error) { if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (!attributes.isDirectory() || attributes.uid !== process.getuid?.() || (attributes.mode & 0o777) !== 0o700) throw new InputError(`Control socket directory must be an ordinary current-user-owned directory with mode 0700: ${directory}`);
}
/** Socket paths are project-specific; Windows named pipes do not require a Unix socket file. */
function endpoint(workspace: Workspace): string {
    const key = createHash('sha256').update(workspace.projectPath).digest('hex').slice(0, 24);
    return process.platform === 'win32' ? `\\\\.\\pipe\\ptbk-${key}` : join(socketDirectory(), `${key}.sock`);
}
/** Read a process record without starting or repairing the selected project. @private */
export async function readServiceRecord(workspace: Workspace): Promise<ServiceRecord | undefined> {
    try {
        const record = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(workspace.statePath, 'process.json')), 'utf8')) as ServiceRecord;
        if (record.version !== 1 || record.project !== workspace.projectPath || !record.id || !record.token || record.endpoint !== endpoint(workspace)) throw new InputError('Invalid process record; preserved for recovery.');
        return record;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
/** A rejected identity response cannot be accepted as a result or replayed as a mutation. */
class ServiceIdentityChangedError extends Error {
    constructor() { super('Process identity changed; no control response was trusted.'); }
}
/** Authenticate exactly one socket command using the selected immutable process record. */
async function sendServiceCommand(workspace: Workspace, record: ServiceRecord, action: string, input: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    return new Promise((resolve, reject) => {
        const socket = connect(record.endpoint);
        let data = ''; let settled = false;
        socket.setTimeout(5000, () => socket.destroy(new Error('Project control endpoint timed out.')));
        socket.once('connect', () => socket.write(`${JSON.stringify({ token: record.token, identity: record.id, action, input })}\n`));
        socket.on('data', chunk => {
            data += chunk.toString('utf8');
            if (Buffer.byteLength(data) > 2 * 1024 * 1024) socket.destroy(new Error('Control reply exceeds 2 MiB.'));
            const newline = data.indexOf('\n');
            if (newline < 0) return;
            try {
                const reply = JSON.parse(data.slice(0, newline)) as { id: string; pid: number; error?: string; result: Record<string, unknown> };
                if (reply.id !== record.id || reply.pid !== record.pid) throw new ServiceIdentityChangedError();
                settled = true;
                socket.end();
                if (reply.error) reject(new InputError(reply.error)); else resolve(reply.result);
            } catch (error) { socket.destroy(); reject(error); }
        });
        socket.once('error', error => {
            settled = true;
            if (['ENOENT', 'ECONNREFUSED'].includes((error as NodeJS.ErrnoException).code || '')) resolve(undefined);
            else reject(error);
        });
        socket.once('end', () => { if (!settled) reject(new Error('Project control endpoint closed without a complete reply.')); });
    });
}
/** Send bounded authenticated commands; only read-only inspection may retry a recorded handover. @private */
export async function serviceCommand(workspace: Workspace, action = 'inspect', input: Record<string, unknown> = {}): Promise<Record<string, unknown> | undefined> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const record = await readServiceRecord(workspace);
        if (!record) return undefined;
        await prepareSocketDirectory(false);
        try { return await sendServiceCommand(workspace, record, action, input); }
        catch (error) {
            if (action !== 'inspect' || attempt > 0 || !(error instanceof ServiceIdentityChangedError)) throw error;
            const replacement = await readServiceRecord(workspace);
            if (!replacement || replacement.id === record.id) throw error;
            // Ignore the mismatched response and authenticate anew using current disk credentials.
        }
    }
    throw new ServiceIdentityChangedError();
}

/** Constant-time validation rejects unknown local tokens before control handling. */
function matchesToken(actual: unknown, expected: string): boolean {
    return typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
/** Parse a bounded JSON body with explicit errors rather than trusting Content-Length. */
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
    let bytes = 0; const chunks: Buffer[] = [];
    for await (const chunk of request) { const part = Buffer.from(chunk); bytes += part.length; if (bytes > 256 * 1024) throw new InputError('Control body exceeds 256 KiB.'); chunks.push(part); }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Control body must be an object.');
    return value as Record<string, unknown>;
}
/** Render the minimal dashboard using textContent for project-controlled text. */
function dashboard(token: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Promptbook</title><style nonce="${token}">body{font:16px system-ui;max-width:960px;margin:32px auto;padding:16px;background:#f6f8f6;color:#17372b}button,input,textarea{font:inherit;padding:8px;margin:4px}article,pre{background:white;padding:16px;border:1px solid #ccd8cf;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#53675c}textarea{width:95%}</style></head><body><h1>Promptbook</h1><p id="status"></p><button data-action="pause">Pause</button><button data-action="resume">Resume</button><button data-action="skip-wait">Skip wait</button><button data-action="finish">Finish and exit</button><button data-action="stop">Stop</button><p id="result" role="status"></p><h2>Requests</h2><div id="requests"></div><h2>Queue</h2><div id="tasks"></div><details><summary>Agents, harnesses, settings and statistics</summary><pre id="details"></pre><textarea id="settings" placeholder='{"waitBetweenPrompts":1000}'></textarea><button id="apply">Apply settings</button></details><details><summary>Recent events</summary><pre id="events"></pre></details><script nonce="${token}">const token=${JSON.stringify(token)};const headers={'X-Ptbk-Token':token,'Content-Type':'application/json'};async function command(action,input={}){const r=await fetch('/api/control',{method:'POST',headers,body:JSON.stringify({action,...input})});const value=await r.json();document.getElementById('result').textContent=JSON.stringify(value);await refresh()}document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>command(b.dataset.action));document.getElementById('apply').onclick=()=>{try{command('settings',{settings:JSON.parse(document.getElementById('settings').value)})}catch(e){document.getElementById('result').textContent=e.message}};async function refresh(){try{const data=await(await fetch('/api/state',{headers})).json();document.getElementById('status').textContent=data.project+' · '+data.status+(data.paused?' · paused':'')+(data.currentTask?' · '+data.currentTask:'');for(const name of ['tasks','requests']){const root=document.getElementById(name);root.replaceChildren();for(const item of data[name]||[]){const card=document.createElement('article');card.textContent=name==='tasks'?item.title+' · '+item.status+' · '+item.eligibility.kind+': '+item.eligibility.reason:item.prompt+'\\n'+item.reason;if(name==='requests'&&item.status==='pending'){const answer=document.createElement('input');const submit=document.createElement('button');submit.textContent='Answer';submit.onclick=()=>command('answer',{id:item.id,response:answer.value});card.append(answer,submit)}root.append(card)}}document.getElementById('details').textContent=JSON.stringify({agents:data.agents,harnesses:data.harnesses,settings:data.settings,pendingSettings:data.pendingSettings,restartSettings:data.restartSettings,settingsCapabilities:data.settingsCapabilities,statistics:data.statistics},null,2);document.getElementById('events').textContent=(data.events||[]).map(e=>e.type+': '+e.message).join('\\n')}catch(e){document.getElementById('result').textContent=e.message}}refresh();setInterval(refresh,1500);</script></body></html>`;
}

/** Bind a guarded localhost interface; omitted port searches from 3000. @private */
export async function openDashboard(workspace: Workspace, control: RuntimeControl, selectedPort?: number): Promise<{ url: string; close(): Promise<void> }> {
    if (selectedPort !== undefined && (!Number.isInteger(selectedPort) || selectedPort < 1 || selectedPort > 65535)) throw new InputError('--port must be between 1 and 65535.');
    let port = selectedPort ?? 3000;
    const server = createHttpServer((request, response) => {
        /** Write redacted JSON for all observed state and control outcomes. */
        const respond = (code: number, value: unknown) => { if (response.headersSent) return; response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(redactSecrets(JSON.stringify(value), workspace.projectPath)); };
        void (async () => {
            const origin = `http://127.0.0.1:${port}`;
            if (request.headers.host !== `127.0.0.1:${port}` || request.headers.origin && request.headers.origin !== origin) return respond(403, { error: 'Invalid local host/origin.' });
            const url = new URL(request.url || '/', origin);
            if (request.method === 'GET' && url.pathname === '/') {
                response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${control.token}'; style-src 'nonce-${control.token}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'` }); response.end(dashboard(control.token)); return;
            }
            if (!matchesToken(request.headers['x-ptbk-token'], control.token)) return respond(403, { error: 'Session token required.' });
            if (request.method !== 'GET' && request.headers.origin !== origin) return respond(403, { error: 'Local origin required.' });
            if (request.method === 'GET' && url.pathname === '/api/state') return respond(200, await control.snapshot());
            if (request.method === 'POST' && url.pathname === '/api/control') { const input = await body(request); if (typeof input.action !== 'string') throw new InputError('A control action is required.'); return respond(200, await control.command(input.action, input)); }
            if (request.method === 'POST' && url.pathname === '/api/task') return respond(200, await control.command('edit-task', await body(request)));
            return respond(404, { error: 'Route not found.' });
        })().catch(error => respond(error instanceof InputError || error instanceof SyntaxError ? 400 : 409, { error: (error as Error).message }));
    });
    server.requestTimeout = 15_000;
    for (;;) {
        try {
            await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); }); });
            break;
        } catch (error) { if (!selectedPort && (error as NodeJS.ErrnoException).code === 'EADDRINUSE' && port < 65535) port++; else throw new Error(`Cannot listen on localhost:${port}: ${(error as Error).message}`); }
    }
    return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => server.closeAllConnections(), 2000);
        server.close(error => { clearTimeout(timeout); if (error) reject(error); else resolve(); });
        server.closeIdleConnections();
    }) };
}

/** Materialize engine-generated work under the same mutation lease as authoring. */
async function systemTask(workspace: Workspace, task: Partial<TaskDefinition> & Pick<TaskDefinition, 'title' | 'payload'>): Promise<TaskDefinition> {
    const id = task.id ?? randomUUID();
    const target = await confinePath(workspace.projectPath, join(workspace.tasksPath, `${new Date().toISOString().slice(0, 10)}-${id}.book`));
    const definition: TaskDefinition = { status: 'todo', priority: 0, rules: [], runners: [], diagnostics: [], scheduleRevision: '', ...task, id, source: { format: 'book', path: target, relativePath: relative(workspace.projectPath, target), sectionIndex: 0, revision: '' } };
    await mkdir(workspace.tasksPath, { recursive: true });
    await writeFile(target, serializeTaskBook(definition), { flag: 'wx' });
    return (await discoverTasks(workspace)).find(candidate => candidate.id === id)!;
}

/** A Markdown assignment is an ordinary result file, leaving the original queue source intact. */
interface MarkdownRouting {
    version: 1; taskId: string; sourcePayloadChecksum: string;
    agent: string; harness: string; model?: string; thinkingLevel?: string;
}

/** Resolve the current committed Manager result for each legacy definition. */
async function serviceTasks(workspace: Workspace): Promise<TaskDefinition[]> {
    const tasks = await discoverTasks(workspace);
    for (const task of tasks.filter((candidate) => candidate.source.format === 'markdown' && candidate.status === 'todo')) {
        const assignments = tasks.filter((candidate) => candidate.origin === `engine:assignment:${task.id}`);
        if (!assignments.length) continue;
        task.dependencies = [...(task.dependencies ?? []), ...assignments.map((candidate) => `#${candidate.id}`)];
        if (assignments.length !== 1 || assignments[0]!.status !== 'done' || assignments[0]!.diagnostics.length || assignments[0]!.relationshipDiagnostics?.length) {
            task.relationshipDiagnostics = [...(task.relationshipDiagnostics ?? []), 'Its Manager assignment requires a valid completed result.'];
            continue;
        }
        try {
            const filename = await confinePath(workspace.projectPath, join(workspace.tasksPath, 'routing', `${task.id}.json`));
            const routing = JSON.parse(await readFile(filename, 'utf8')) as MarkdownRouting;
            if (routing.version !== 1 || routing.taskId !== task.id || routing.sourcePayloadChecksum !== checksum(task.payload)
                || typeof routing.agent !== 'string' || !routing.agent.trim() || typeof routing.harness !== 'string' || !routing.harness.trim()
                || routing.model !== undefined && (typeof routing.model !== 'string' || /\s/.test(routing.model))
                || routing.thinkingLevel !== undefined && (typeof routing.thinkingLevel !== 'string' || /\s/.test(routing.thinkingLevel))) throw new Error('The Manager routing result is invalid or belongs to a changed assignment.');
            getHarness(routing.harness);
            task.agent = routing.agent.replace(/^@/, ''); task.harness = routing.harness;
            task.model = routing.model; task.thinkingLevel = routing.thinkingLevel;
        } catch (error) { task.relationshipDiagnostics = [...(task.relationshipDiagnostics ?? []), `Manager routing requires review: ${(error as Error).message}`]; }
    }
    return tasks;
}

/** Evaluate the same source, routing and authorization prerequisites in every control channel. */
async function readiness(workspace: Workspace, task: TaskDefinition, options: ServiceOptions, inventory: HarnessInventory[], state?: OccurrenceState): Promise<EligibilityResult> {
    let outcome = evaluateEligibility(task, { now: Date.now(), timezone: workspace.timezone, harness: options.harness, model: options.model, thinkingLevel: options.thinkingLevel, minPriority: options.minPriority, maxPriority: options.maxPriority }, state);
    if (!['ready', 'filtered'].includes(outcome.kind) || task.priority < (options.minPriority ?? 0) || task.priority > (options.maxPriority ?? Infinity)) return outcome;
    let model = options.model ?? task.model;
    try {
        const selection = await resolveAgentSelection(workspace, options.agent ?? task.agent ?? 'Developer');
        model ??= selection.model;
        outcome = evaluateEligibility(task, { now: Date.now(), timezone: workspace.timezone, harness: options.harness ?? task.harness, model, thinkingLevel: options.thinkingLevel ?? task.thinkingLevel, agent: selection.path, agentAliases: selection.aliases, minPriority: options.minPriority, maxPriority: options.maxPriority }, state);
    } catch (error) { return { kind: 'blocked', reason: `Required agent is unavailable: ${(error as Error).message}` }; }
    if (outcome.kind !== 'ready' || options.automatic === false) return outcome;
    const harness = options.harness ?? task.harness;
    if (!task.agent || !harness) return { kind: 'blocked', reason: 'Manager must assign the missing agent/harness before execution.' };
    const available = inventory.find((candidate) => candidate.name === harness && candidate.usable && (!options.enabledHarnesses || options.enabledHarnesses.includes(harness)));
    if (!available) return { kind: 'blocked', reason: `Required harness ${harness} is unavailable or not authorized.` };
    const thinking = options.thinkingLevel ?? task.thinkingLevel;
    if (thinking && !available.thinkingLevels.includes(thinking)) return { kind: 'blocked', reason: `Harness ${harness} does not support thinking level ${thinking}.` };
    if (model && available.models.length && !available.models.includes(model)) return { kind: 'blocked', reason: `Model ${model} is unavailable in harness ${harness}.` };
    return outcome;
}

/** Generate a visible Manager prerequisite without replacing any explicit target requirement. */
async function assignment(workspace: Workspace, target: TaskDefinition, inventories: HarnessInventory[], options: ServiceOptions): Promise<boolean> {
    if (target.origin?.startsWith('engine:') || target.agent && target.harness && target.priorityResolved !== false) return false;
    const related = (await discoverTasks(workspace)).find(task => task.origin === `engine:assignment:${target.id}`);
    if (related) {
        if (related.status === 'done') await createRequest(workspace, { kind: 'action', taskId: target.id, reason: 'Manager completed without usable routing.', prompt: `Review ${target.source.relativePath} and fill its missing routing/priority; then resume the project.` });
        return false;
    }
    const lease = await acquireLease(workspace);
    try {
        const baseline = await captureSnapshot(workspace.gitRoot ?? workspace.projectPath);
        const targetPath = relative(baseline.root, target.source.path).split('\\').join('/');
        if (baseline.dirtyPaths.includes(targetPath)) throw new InputError('Manager cannot change or assign an uncommitted task source; preserve and commit its current edits first.');
        target = await assignTaskId(target);
        const id = randomUUID();
        const legacy = target.source.format === 'markdown';
        const routing = relative(workspace.projectPath, join(workspace.tasksPath, 'routing', `${target.id}.json`)).split('\\').join('/');
        const resultInstructions = legacy
            ? `Keep the original Markdown source unchanged. Create ${routing} as JSON with version:1, taskId:${JSON.stringify(target.id)}, sourcePayloadChecksum:${JSON.stringify(checksum(target.payload))}, agent and harness strings, and optional model/thinkingLevel strings. This readable result file supplies the legacy task's routing after this assignment completes.`
            : `Write TASK AGENT and TASK HARNESS in the target source; select a supported model/thinking setting when known or use the harness's native default without inventing one. Preserve its assignment prerequisite #${id}.`;
        const generated = await systemTask(workspace, { id, title: `Assign ${target.title}`, agent: '@Manager', harness: options.harness || inventories.find(item => item.usable)?.name, model: options.model, thinkingLevel: options.thinkingLevel, priority: target.priority, parent: `#${target.id}`, origin: `engine:assignment:${target.id}`, payload: `Select only missing execution choices in ${target.source.relativePath} for task #${target.id}. Preserve every explicit requirement. Available authorized harness inventory:\n${JSON.stringify(inventories)}\nAvailable ordinary roles: ${(await discoverAgents(workspace.projectPath)).filter(agent => !agent.hidden).map(agent => agent.name).join(', ')}. Resolve natural-language priority if needed and retain its original wording in TASK NOTE. ${resultInstructions} Do not implement the target task.` });
        if (!legacy) await updateTaskControls(target, { dependencies: [...(target.dependencies || []), `#${id}`] });
        await lease.assertOwned();
        await commitScoped(baseline, `Create assignment for ${target.title}`, { paths: [targetPath, relative(baseline.root, generated.source.path).split('\\').join('/')], protectedPaths: baseline.dirtyPaths });
        return true;
    } finally { await lease.release(); }
}

/** Fair goal enquiries have durable cooldowns and only occur with an entirely empty backlog. */
async function enquire(workspace: Workspace, inventory: HarnessInventory[], options: ServiceOptions): Promise<void> {
    const filename = await confinePath(workspace.projectPath, join(workspace.statePath, 'discovery.json'));
    let schedule = { version: 1, nextAt: 0, index: 0 };
    try { schedule = JSON.parse(await readFile(filename, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (Date.now() < schedule.nextAt) return;
    const agents = (await discoverAgents(workspace.projectPath)).filter(agent => !agent.hidden);
    if (!agents.length) return;
    const lease = await acquireLease(workspace);
    try {
        const baseline = await captureSnapshot(workspace.gitRoot ?? workspace.projectPath);
        const agent = agents[schedule.index % agents.length]!;
        const generated = await systemTask(workspace, { title: `Review goals for ${agent.name}`, agent: agent.path, harness: options.harness || inventory.find(item => item.usable)?.name, model: options.model, thinkingLevel: options.thinkingLevel, origin: `engine:goal-enquiry:${agent.name}`, payload: 'Review your goals and current project evidence. Create bounded useful task Books only when justified, including future dates where appropriate. If no useful work is needed, explain why without inventing busywork. Do not perform the proposed work during this enquiry.' });
        await lease.assertOwned();
        await commitScoped(baseline, `Create goal enquiry for ${agent.name}`, { paths: [relative(baseline.root, generated.source.path).split('\\').join('/')], protectedPaths: baseline.dirtyPaths });
        await atomicWrite(filename, { version: 1, nextAt: Date.now() + 3600000, index: schedule.index + 1 });
    } finally { await lease.release(); }
}

/** Operate one project indefinitely while sharing controls and preserving every failure. @private */
export async function runService(workspace: Workspace, supplied: ServiceOptions): Promise<void> {
    validateRunOptions(supplied);
    if (supplied.noCommit || supplied.limit !== undefined || supplied.noAuto) throw new InputError('start requires automatic task commits and an indefinite agenda; use run for finite/manual work.');
    const existing = await serviceCommand(workspace);
    if (existing) throw new InputError('This project already has a running supervisor. Use status/show or stop.');
    if (supplied.signal?.aborted) return;
    await loadProjectSecrets(workspace.projectPath);
    await mkdir(await confinePath(workspace.projectPath, workspace.statePath), { recursive: true, mode: 0o700 });
    await prepareSocketDirectory(true);
    const ownerFile = join(workspace.statePath, 'service-owner.lock');
    const ownerId = randomUUID();
    const ownerRecord = { version: 1, id: ownerId, pid: process.pid, birth: await processBirth(process.pid), host: hostname() };
    if (!ownerRecord.birth) throw new InputError('Supervisor process birth identity is unavailable; startup cannot safely establish ownership.');
    const recoveryDirectory = join(workspace.statePath, 'service-owner-recovery.lock');
    const recoveryFile = join(recoveryDirectory, 'owner.json');
    const recoveryContents = JSON.stringify({ ...ownerRecord, startedAt: Date.now() });
    let recovering = false;
    try {
        await lstat(recoveryDirectory);
        throw new InputError(`Supervisor ownership recovery is locked at ${recoveryDirectory}. Inspect its owner.json before retrying; interrupted recovery locks are preserved.`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    try {
        for (let attempt = 0; ; attempt++) {
            try { await writeFile(ownerFile, JSON.stringify(ownerRecord), { flag: 'wx', mode: 0o600 }); break; }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || attempt > 0) throw error;
                const original = await readFile(ownerFile, 'utf8');
                const owner = JSON.parse(original) as typeof ownerRecord;
                if (owner.version !== 1 || typeof owner.id !== 'string' || !owner.id || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.birth !== 'string' || !owner.birth || typeof owner.host !== 'string' || !owner.host) throw new InputError('Supervisor ownership has no verifiable process birth and host identity; preserved for investigation.');
                if (owner.host !== ownerRecord.host) throw new InputError(`Supervisor ownership belongs to another host (${owner.host}); preserved for investigation.`);
                let alive = true; try { process.kill(owner.pid, 0); } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
                const birth = alive ? await processBirth(owner.pid) : undefined;
                if (alive && (!birth || birth === owner.birth)) throw new InputError(`A supervisor launch/process already owns this project (PID ${owner.pid}); process birth ${birth ? 'matches' : 'cannot be verified'}.`);
                await mkdir(recoveryDirectory, { mode: 0o700 }).catch(error => {
                    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError(`Supervisor ownership recovery is locked at ${recoveryDirectory}. Inspect its owner.json before retrying; interrupted recovery locks are preserved.`);
                    throw error;
                });
                recovering = true;
                await writeFile(recoveryFile, recoveryContents, { flag: 'wx', mode: 0o600 });
                if (await readFile(ownerFile, 'utf8') !== original) throw new InputError('Supervisor ownership changed during recovery.');
                await unlink(ownerFile);
            }
        }
    } finally {
        if (recovering) {
            let recorded: string | undefined;
            try { recorded = await readFile(recoveryFile, 'utf8'); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            if (recorded !== undefined && recorded !== recoveryContents) throw new InputError('Supervisor recovery ownership changed; its recovery lock was preserved.');
            if (recorded !== undefined) await unlink(recoveryFile);
            await rmdir(recoveryDirectory);
        }
    }
    const controller = new AbortController();
    const browser = new ProjectBrowser(workspace, { mode: supplied.browserMode, profile: supplied.browserProfile, signal: controller.signal });
    let options = { ...supplied, mode: supplied.mode || 'daemon' };
    let paused = false; let finish = false; let skip = false; let waiting = false; let running = false;
    let pending: Partial<ServiceOptions> = {}; let restartSettings: Partial<ServiceOptions> = {};
    let currentTask: string | undefined; let currentOccurrenceId: string | undefined; let status = 'starting'; let lastResult: RunResult | undefined;
    let inventory: HarnessInventory[] = []; let inventoryAt = 0; let lastWake = 0; let lastTaskStarted = 0;
    const statistics = { completed: 0, failed: 0, startedAt: Date.now() };
    const events: EngineEvent[] = [];
    const socketPath = endpoint(workspace);
    const record: ServiceRecord = { version: 1, id: randomUUID(), pid: process.pid, ownerId, project: workspace.projectPath, installation: fileURLToPath(new URL('../..', import.meta.url)), node: process.execPath, endpoint: socketPath, token: randomUUID(), mode: options.mode, desired: 'running', startedAt: Date.now(), updatedAt: Date.now(), persistent: options.mode === 'daemon' && !options.noPersist, settings: serialSettings(options), status };
    /** Persist activity without exposing process authentication in user output. */
    const persist = async () => { record.updatedAt = Date.now(); record.status = status; record.settings = serialSettings({ ...options, ...restartSettings }); await atomicWrite(join(workspace.statePath, 'process.json'), record); };
    /** Add bounded, redacted observations that remain distinct from provider output. */
    const emit = (event: EngineEvent) => { events.push({ ...event, message: redactSecrets(event.message, workspace.projectPath) }); if (events.length > 160) events.shift(); if (event.taskId) currentTask = event.taskId; if (event.type === 'claimed') { currentOccurrenceId = event.occurrenceId; lastTaskStarted = Date.now(); } options.onEvent?.(event); };
    const control: RuntimeControl = { token: record.token,
        async snapshot() {
            const tasks = await serviceTasks(workspace); const ledger = await readLedger(workspace);
            const summaries = await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, payload: task.payload, status: ledger.tasks[task.id]?.claim ? 'in-progress' : task.status, priority: task.priority, priorityRaw: task.priorityRaw, priorityResolved: task.priorityResolved, agent: task.agent, harness: task.harness, model: task.model, thinkingLevel: task.thinkingLevel, parent: task.parent, dependencies: task.dependencies, due: task.dueRaw, source: task.source, eligibility: await readiness(workspace, task, options, inventory, ledger.tasks[task.id]) })));
            return { id: record.id, pid: record.pid, project: workspace.projectPath, mode: record.mode, status, paused, running, currentTask, url: record.url, persistent: record.persistent, settings: serialSettings(options), pendingSettings: pending, restartSettings, settingsCapabilities: { live: [...LIVE_SETTINGS], requiresRestart: [...STARTUP_SETTINGS], units: 'Pacing values use milliseconds.' }, statistics, lastResult, timezone: workspace.timezone, agents: (await discoverAgents(workspace.projectPath)).map(agent => ({ name: agent.name, hidden: agent.hidden, path: relative(workspace.projectPath, agent.path) })), harnesses: inventory, requests: await listRequests(workspace, true), browser: browser.status(), events,
                tasks: summaries };
        },
        async command(action, input = {}) {
            if (action === 'inspect') return control.snapshot();
            if (action === 'pause') { paused = true; terminal.setPaused(true); }
            else if (action === 'resume') { paused = false; terminal.setPaused(false); lastWake = 0; }
            else if (action === 'skip-wait') { const cooldown = lastWake > Date.now(); skip = waiting && running; if (cooldown) lastWake = 0; return { skipped: skip || cooldown }; }
            else if (action === 'finish') { finish = !finish; terminal.setStopping(finish); return { finishAfterTask: finish }; }
            else if (action === 'stop') { record.desired = 'stopped'; await persist(); controller.abort(); }
            else if (action === 'edit-task') {
                if (typeof input.id !== 'string' || typeof input.revision !== 'string' || typeof input.content !== 'string' || Buffer.byteLength(input.content) > 256 * 1024) throw new InputError('Task edit requires id, revision and content within 256 KiB.');
                if (running) throw new Error('The active task owns the workspace; pause and wait for a safe boundary before editing.');
                const lease = await acquireLease(workspace);
                try {
                    const matches = (await discoverTasks(workspace)).filter(task => task.id === input.id);
                    if (matches.length !== 1) throw new Error(matches.length ? 'Task ID is ambiguous; resolve duplicate definitions before editing.' : 'Task not found.');
                    const task = matches[0]!;
                    await assertConfined(task.source.path, workspace.projectPath);
                    const attributes = await lstat(task.source.path);
                    if (!attributes.isFile()) throw new Error('Task editing requires an ordinary project-local source file.');
                    const previous = await readFile(task.source.path);
                    if (checksum(previous) !== input.revision) throw new Error('Source changed; reload before editing.');
                    const temporary = `${task.source.path}.${randomUUID()}.tmp`;
                    try {
                        await writeFile(temporary, input.content, { flag: 'wx', mode: attributes.mode });
                        await lease.assertOwned(); await assertConfined(task.source.path, workspace.projectPath);
                        if (!(await readFile(task.source.path)).equals(previous)) throw new Error('Source changed while saving; reload before editing.');
                        await rename(temporary, task.source.path);
                    } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
                    lastWake = 0; return { saved: true };
                } finally { await lease.release(); }
            }
            else if (action === 'answer') {
                if (typeof input.id !== 'string' || typeof input.response !== 'string') throw new InputError('Answer requires request id and response.');
                const answer = await answerRequest(workspace, input.id, input.response, input.status as 'answered' | undefined); lastWake = 0; return answer;
            } else if (action === 'settings') {
                if (!input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings)) throw new InputError('settings must be an object.');
                const update = input.settings as Partial<ServiceOptions>;
                for (const key of Object.keys(update)) if (!LIVE_SETTINGS.has(key) && !STARTUP_SETTINGS.has(key)) throw new InputError(`Unknown/immutable setting ${key}.`);
                for (const [key, value] of Object.entries(update)) {
                    if (['noServer', 'noPersist', 'autoPull', 'autoPush', 'isolate', 'normalizeLineEndings', 'noQuestions', 'allowCredits', 'preserveLogs'].includes(key) && typeof value !== 'boolean') throw new InputError(`${key} must be a boolean.`);
                    if (['harness', 'model', 'thinkingLevel', 'agent', 'context', 'check', 'browserProfile'].includes(key) && typeof value !== 'string') throw new InputError(`${key} must be a string.`);
                }
                if (update.mode && !['daemon', 'raw', 'interactive'].includes(update.mode)) throw new InputError('mode must be daemon, raw or interactive.');
                if (update.port !== undefined && (!Number.isInteger(update.port) || update.port < 1 || update.port > 65535)) throw new InputError('port must be between 1 and 65535.');
                if (update.checkBefore && !['no', 'yes-and-fail', 'yes-and-fix'].includes(update.checkBefore)) throw new InputError('Invalid checkBefore setting.');
                if (update.gitChanges && !['fail', 'ignore', 'continue'].includes(update.gitChanges)) throw new InputError('Invalid gitChanges setting.');
                if (update.harness) getHarness(update.harness);
                if (update.enabledHarnesses) { if (!Array.isArray(update.enabledHarnesses)) throw new InputError('enabledHarnesses must be an array.'); for (const name of update.enabledHarnesses) getHarness(name); }
                if (update.browserMode && !['headless', 'headful'].includes(update.browserMode)) throw new InputError('browserMode must be headless or headful.');
                validateRunOptions({ ...options, ...pending, ...update });
                for (const [key, value] of Object.entries(update)) { if (STARTUP_SETTINGS.has(key)) Object.assign(restartSettings, { [key]: value }); else Object.assign(pending, { [key]: value }); }
                if (!running) { if (pending.browserMode) await browser.setMode(pending.browserMode); options = { ...options, ...pending }; pending = {}; }
                inventoryAt = 0; await persist(); return { active: serialSettings(options), pending, requiresRestart: restartSettings };
            } else throw new InputError(`Unknown control action ${action}.`);
            await persist(); return { paused, pausePending: paused && running, status, stopping: controller.signal.aborted };
        },
    };
    const socket = createSocketServer(client => {
        let text = '';
        client.setTimeout(10_000, () => client.destroy());
        client.on('data', chunk => {
            text += chunk.toString('utf8'); if (Buffer.byteLength(text) > 32 * 1024) { client.destroy(); return; }
            const index = text.indexOf('\n'); if (index < 0) return;
            client.removeAllListeners('data');
            void (async () => {
                const input = JSON.parse(text.slice(0, index));
                if (input.identity !== record.id || !matchesToken(input.token, record.token)) throw new InputError('Project process identity/token mismatch.');
                return control.command(input.action, input.input);
            })().then(result => client.end(`${redactSecrets(JSON.stringify({ id: record.id, pid: record.pid, result }), workspace.projectPath)}\n`), error => client.end(`${JSON.stringify({ id: record.id, pid: record.pid, error: (error as Error).message })}\n`));
        });
    });
    const terminal = createTerminal(options.mode === 'interactive', () => controller.abort(), workspace.projectPath, { onControl: async action => {
        if (action === 'requests') {
            const outstanding = await listRequests(workspace, true);
            if (!outstanding.length) { terminal.status('There are no pending user requests.'); return; }
            outstanding.forEach((request, index) => terminal.status(`${index + 1}. ${request.prompt}\nReason: ${request.reason}\nRequest: ${request.id}`));
            const selected = outstanding.length === 1 ? outstanding[0]! : outstanding[Number(await terminal.question('Request number (blank to cancel): ')) - 1];
            if (!selected) return;
            const response = await terminal.question('Answer (blank leaves the request pending): ');
            if (response.trim()) await control.command('answer', { id: selected.id, response });
        } else if (action === 'settings') {
            const value = await terminal.question('Runtime settings as JSON (blank to cancel): ');
            if (value.trim()) { const outcome = await control.command('settings', { settings: JSON.parse(value) }); terminal.status(JSON.stringify(outcome)); }
        } else {
            const outcome = await control.command(action); terminal.status(JSON.stringify(outcome));
        }
    } });
    let lastPresentation = '';
    let lastRequestPresentation = '';
    /** Foreground requests remain visible while an active provider is waiting for a human reply. */
    const announceRequests = async () => {
        if (options.mode === 'daemon') return;
        const requests = await listRequests(workspace, true);
        const shown = requests.slice(0, 20);
        const signature = JSON.stringify([requests.length, shown.map(request => [request.id, request.prompt, request.reason])]);
        if (signature === lastRequestPresentation) return;
        lastRequestPresentation = signature;
        for (const request of shown) terminal.status(`Pending request ${request.id}: ${request.prompt}\nReason: ${request.reason}\n${options.mode === 'interactive' ? 'Press Q to answer this request, or ' : ''}answer with ptbk answer ${JSON.stringify(request.id)} --response "your reply" --path ${JSON.stringify(workspace.projectPath)}.`);
        if (requests.length > shown.length) terminal.status(`${requests.length - shown.length} more pending requests are available through ptbk answer or status.`);
    };
    /** Keep foreground queue/statistics/request presentation synchronized with the control model. */
    const present = async () => {
        if (options.mode !== 'interactive') return;
        const snapshot = await control.snapshot();
        const tasks = snapshot.tasks as Array<{ id: string; title: string; status: string; eligibility: EligibilityResult }>;
        const requests = snapshot.requests as Array<{ id: string; prompt: string }>;
        const summary = `${snapshot.status}${paused ? ' · paused' : ''} · ${statistics.completed} completed · ${statistics.failed} failed\nQueue (${tasks.length}):\n${tasks.slice(0, 20).map(task => `${task.title} · ${task.status} · ${task.eligibility.kind}: ${task.eligibility.reason}`).join('\n') || 'No queued work.'}\nPending user requests (${requests.length}): ${requests.map(request => `${request.id}: ${request.prompt}`).join('; ') || 'none'}. Q answers requests; C changes settings.`;
        if (summary !== lastPresentation) { lastPresentation = summary; terminal.status(summary); }
    };
    const abort = () => controller.abort(); supplied.signal?.addEventListener('abort', abort, { once: true });
    let http: Awaited<ReturnType<typeof openDashboard>> | undefined;
    let ownsSocket = false;
    let requestObservation: Promise<void> | undefined;
    const requestMonitor = setInterval(() => {
        if (requestObservation || controller.signal.aborted || options.mode === 'daemon') return;
        requestObservation = announceRequests().catch(() => {}).finally(() => { requestObservation = undefined; });
    }, 1000);
    requestMonitor.unref();
    try {
        const previous = await readServiceRecord(workspace);
        if (previous && process.platform !== 'win32') {
            // A stale endpoint may be removed only after its authenticated connection is unavailable.
            try {
                const attributes = await lstat(socketPath);
                if (!attributes.isSocket() || attributes.uid !== process.getuid?.()) throw new InputError('Refusing to remove a control endpoint that is not a current-user-owned socket.');
            } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            await unlink(socketPath).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
        }
        await persist();
        await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.listen(socketPath, resolve); });
        ownsSocket = true;
        if (process.platform !== 'win32') await chmod(socketPath, 0o600);
        if (options.automatic !== false) {
            const lease = await acquireLease(workspace);
            try {
                const baseline = await captureSnapshot(workspace.gitRoot ?? workspace.projectPath);
                const files = await ensureCoreAgents(workspace.projectPath);
                await lease.assertOwned();
                if (files.length) await commitScoped(baseline, 'Create missing Promptbook core agents', { paths: files.map(file => relative(baseline.root, file).split('\\').join('/')), protectedPaths: baseline.dirtyPaths });
            } finally { await lease.release(); }
        }
        if (controller.signal.aborted) return;
        if (!options.noServer) { http = await openDashboard(workspace, control, options.port); record.url = http.url; }
        if (controller.signal.aborted) return;
        status = 'ready'; await persist(); supplied.onReady?.(record);
        if (options.mode !== 'daemon') process.stdout.write(`ptbk project: ${workspace.projectPath}\n${record.url ? `ptbk dashboard: ${record.url}\n` : ''}`);
        await present();
        while (!controller.signal.aborted && !finish) {
            try {
                if (pending.browserMode) await browser.setMode(pending.browserMode);
                options = { ...options, ...pending }; pending = {};
                if (Date.now() - inventoryAt > 60_000) { inventory = options.automatic === false && !options.inspectHarnesses ? [] : await (options.inspectHarnesses || inspectHarnesses)(workspace.projectPath, { signal: controller.signal }); inventoryAt = Date.now(); }
                const available = inventory.filter(item => item.usable && (!options.enabledHarnesses || options.enabledHarnesses.includes(item.name)) && (!options.harness || item.name === options.harness));
                if (paused || terminal.isPaused() || Date.now() < lastWake) { status = paused || terminal.isPaused() ? 'paused' : 'waiting'; waiting = status === 'waiting'; terminal.setWaiting(waiting); }
                else if (!available.length && options.automatic !== false) {
                    status = 'setup-required'; await createRequest(workspace, { kind: 'action', reason: 'No installed authenticated authorized harness is available.', prompt: 'Install and authenticate a supported harness with ptbk init, or review the harness inventory. Resume after setup.' }); lastWake = Date.now() + 30_000;
                } else {
                    const unresolved = await listRecovery(workspace, { includeSync: true });
                    if (unresolved.length) {
                        const safe = unresolved.find(journal => journal.phase === 'completed' && journal.syncPending || ['completion-ready', 'implementation-ready', 'integrating'].includes(journal.safePhase ?? journal.phase) || journal.pendingPhase === 'result');
                        if (safe) {
                            const recovered = await recoverTask(workspace, safe.taskId, { action: 'resume', occurrence: safe.occurrenceId }, { ...options, signal: controller.signal, onEvent: emit });
                            const { journals: _journals, plan: _plan, ...outcome } = recovered;
                            lastResult = outcome; statistics.completed += outcome.completed; statistics.failed += outcome.failed;
                            if (outcome.failed || outcome.syncPending || outcome.exitCode === 1) {
                                status = outcome.syncPending ? 'sync-pending' : 'recovery-required';
                                await createRequest(workspace, { kind: 'action', taskId: safe.taskId, reason: 'Recorded recovery could not finish safely.', prompt: 'Review ptbk recover and resolve the failed persistence/check/synchronization boundary. Resume retries this same recorded occurrence without inventing a new task.' });
                                lastWake = Date.now() + (options.waitAfterError ?? 600000);
                            } else {
                                if (!(await listRecovery(workspace)).length && options.gitChanges === 'continue') options = { ...options, gitChanges: 'fail' };
                                await persist(); continue;
                            }
                        } else {
                            status = 'recovery-required'; await createRequest(workspace, { kind: 'action', taskId: unresolved[0]!.taskId, reason: 'Interrupted work has an uncertain boundary.', prompt: `Inspect ptbk recover ${unresolved[0]!.taskId} and explicitly choose resume, retry or acknowledge. User work was preserved.` }); lastWake = Date.now() + 10_000;
                        }
                    } else {
                        let tasks = await serviceTasks(workspace);
                        if (options.automatic !== false) {
                            running = true; status = 'preparing'; await persist();
                            try {
                                const unfinished = tasks.filter(task => !['done', 'retired'].includes(task.status));
                                if (!unfinished.length) { await enquire(workspace, available, options); tasks = await serviceTasks(workspace); }
                                const target = tasks.find(task => task.status === 'todo' && !task.diagnostics.length && !task.relationshipDiagnostics?.length && (!task.after || task.after <= Date.now()) && (!task.agent || !task.harness || task.priorityResolved === false) && !task.origin?.startsWith('engine:'));
                                if (target && await assignment(workspace, target, available, options)) { tasks = await serviceTasks(workspace); }
                            } finally { running = false; }
                        }
                        const bootstrap = available[0];
                        const run: RunOptions = { ...options, limit: 1, harness: options.harness || (options.automatic !== false ? bootstrap?.name : undefined), context: await readContext(workspace, options.context), signal: controller.signal, requireAcceptance: options.automatic !== false, check: options.check || (options.automatic !== false ? 'npm run check' : undefined), isPaused: () => paused || terminal.isPaused(), shouldStop: () => finish || terminal.shouldStop(), skipWait: () => { const result = skip || terminal.skipWait(); skip = false; return result; }, onWait: value => { waiting = value; terminal.setWaiting(value); }, onEvent: event => { emit(event); if (options.mode !== 'daemon' && event.type !== 'output') terminal.status(`${event.type}: ${event.message}`); }, onOutput: text => { terminal.output(text); options.onOutput?.(text); } };
                        // Explicit per-task harness choices take precedence over an automatic bootstrap.
                        const ledger = await readLedger(workspace);
                        let ready: TaskDefinition | undefined;
                        for (const candidate of tasks) if ((await readiness(workspace, candidate, options, inventory, ledger.tasks[candidate.id])).kind === 'ready') { ready = candidate; break; }
                        if (paused || terminal.isPaused() || controller.signal.aborted || finish) { status = 'paused'; await persist(); await present(); await delay(1000, undefined, { signal: controller.signal }).catch(() => {}); continue; }
                        if (!ready) { status = 'watching'; await persist(); await present(); await delay(1000, undefined, { signal: controller.signal }).catch(() => {}); if (terminal.shouldStop()) finish = true; continue; }
                        run.onlyTaskId = ready.id;
                        if (ready?.harness && !options.harness) run.harness = ready.harness;
                        if (run.harness && getHarness(run.harness).toolDiscovery) run.tools = browserTools(browser, ready.id, () => currentOccurrenceId);
                        if (ready?.agent && !options.agent) run.agent = ready.agent;
                        if (ready?.model && !options.model) run.model = ready.model;
                        if (ready?.thinkingLevel && !options.thinkingLevel) run.thinkingLevel = ready.thinkingLevel;
                        running = true; status = 'running'; await persist();
                        try { lastResult = await runQueue(workspace, run); statistics.completed += lastResult.completed; statistics.failed += lastResult.failed; }
                        finally { running = false; currentTask = undefined; currentOccurrenceId = undefined; }
                        if (lastResult?.failed || lastResult?.syncPending) {
                            status = lastResult.syncPending ? 'sync-pending' : 'blocked';
                            await createRequest(workspace, { kind: 'action', reason: status, prompt: 'Review recent task diagnostics and ptbk recover. Successful inference and local commits were preserved; resolve the failed phase before resuming.' });
                            lastWake = Date.now() + (options.waitAfterError ?? 600000);
                        } else { status = 'watching'; lastWake = Math.max(Date.now() + (options.waitAfterPrompt ?? 0), lastTaskStarted + (options.waitBetweenPrompts ?? 0)); waiting = lastWake > Date.now(); terminal.setWaiting(waiting); }
                    }
                }
                await persist();
                await present();
            } catch (error) {
                if (controller.signal.aborted) break;
                status = 'blocked'; record.error = redactSecrets((error as Error).message, workspace.projectPath);
                emit({ type: 'error', message: record.error, time: Date.now() });
                await createRequest(workspace, { kind: 'action', reason: 'Runtime could not continue safely.', prompt: record.error }).catch(() => {});
                lastWake = Date.now() + 10_000;
                await persist().catch(() => {});
            }
            await delay(1000, undefined, { signal: controller.signal }).catch(() => {});
            if (terminal.shouldStop()) finish = true;
        }
    } finally {
        clearInterval(requestMonitor); await requestObservation;
        controller.abort(); terminal.close(); supplied.signal?.removeEventListener('abort', abort);
        status = record.desired === 'stopped' || finish || options.mode !== 'daemon' ? 'stopped' : 'interrupted';
        if (finish || options.mode !== 'daemon') record.desired = 'stopped'; await persist().catch(() => {});
        await browser.close();
        await http?.close(); await new Promise<void>(resolve => socket.close(() => resolve()));
        if (ownsSocket && process.platform !== 'win32') await unlink(socketPath).catch(() => {});
        if (JSON.parse(await readFile(ownerFile, 'utf8')).id === ownerId) await unlink(ownerFile);
    }
}

/** Installation paths are persisted for both OS registration and detached local daemons. @private */
export function startupPaths(workspace: Workspace): StartupPaths {
    return { node: process.execPath, worker: fileURLToPath(new URL('./service-worker.js', import.meta.url)), configuration: join(workspace.statePath, 'service-config.json') };
}

/** Start one daemon, either through its OS manager or an explicitly nonpersistent child. @private */
export async function startService(workspace: Workspace, options: ServiceOptions): Promise<Record<string, unknown>> {
    validateRunOptions(options);
    if (options.noCommit || options.limit !== undefined || options.noAuto) throw new InputError('start requires commits and an indefinite automatic agenda.');
    const existing = await serviceCommand(workspace); if (existing) { process.stdout.write(`Project already running: ${workspace.projectPath}\n${existing.url || ''}\n`); return existing; }
    const baseline = await captureSnapshot(workspace.gitRoot || workspace.projectPath);
    if (baseline.dirtyPaths.length && (options.gitChanges ?? 'fail') === 'fail') throw new InputError(`Startup requires a committed baseline. Preserve and commit changes in ${baseline.dirtyPaths.join(', ')} before ptbk start.`);
    const inventories = await (options.inspectHarnesses || inspectHarnesses)(workspace.projectPath, { signal: options.signal });
    if (!inventories.some(item => item.usable && (!options.harness || options.harness === item.name) && (!options.enabledHarnesses || options.enabledHarnesses.includes(item.name)))) throw new InputError(`No authenticated authorized harness is ready. Run ptbk init to install/login.\n${inventories.map(item => `${item.name}: ${item.diagnostic}`).join('\n')}`);
    if (options.mode && options.mode !== 'daemon') { await runService(workspace, options); return { stopped: true }; }
    const directory = await confinePath(workspace.projectPath, workspace.statePath); await mkdir(directory, { recursive: true, mode: 0o700 });
    const lock = join(directory, 'launch.lock');
    const handle = await open(lock, 'wx', 0o600).catch(error => { throw new InputError(`A project launch is already pending (${lock}). Wait for it or inspect a stale launch record: ${(error as Error).message}`); });
    let child: ReturnType<typeof spawn> | undefined;
    try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, id: randomUUID(), createdAt: Date.now() })); await handle.close();
        const paths = startupPaths(workspace);
        await atomicWrite(paths.configuration, { version: 1, project: workspace.projectPath, tasks: workspace.tasksPath, installation: fileURLToPath(new URL('../..', import.meta.url)), options: serialSettings({ ...options, mode: 'daemon' }), desired: 'running' });
        const prior = await readServiceRecord(workspace); if (prior) await atomicWrite(join(workspace.statePath, 'process.json'), { ...prior, desired: 'running' });
        if (!options.noPersist) await installStartup(workspace, paths);
        else {
            if (prior?.persistent) await disableStartup(workspace, paths);
            try { if ((await stat(join(workspace.statePath, 'service.log'))).size > 5 * 1024 * 1024) await rename(join(workspace.statePath, 'service.log'), join(workspace.statePath, 'service.log.1')); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            const log = await open(join(workspace.statePath, 'service.log'), 'a', 0o600);
            try { child = spawn(paths.node, [paths.worker, '--config', paths.configuration], { cwd: workspace.projectPath, detached: true, stdio: ['ignore', log.fd, log.fd], windowsHide: true }); child.unref(); }
            finally { await log.close(); }
            child.once('error', () => {});
        }
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            const state = await serviceCommand(workspace);
            if (state && !['starting', 'stopped', 'interrupted'].includes(String(state.status))) {
                process.stdout.write(`ptbk started: ${workspace.projectPath}\n${options.noPersist ? 'Persistence disabled.\n' : 'Startup persistence installed for this user/project.\n'}${state.url ? `Dashboard: ${state.url}\n` : ''}Use ptbk status, ptbk answer, or ptbk stop --path ${JSON.stringify(workspace.projectPath)}.\n`);
                if (state.url && !options.noQr) process.stdout.write(await QRCode.toString(String(state.url), { type: 'terminal', small: true }));
                return state;
            }
            await delay(200, undefined, { signal: options.signal });
        }
        throw new Error(`Project did not confirm startup within 30 seconds. Inspect ${join(workspace.statePath, 'service.log')}; no successful start was reported.`);
    } catch (error) {
        const filename = startupPaths(workspace).configuration;
        try { const saved = JSON.parse(await readFile(filename, 'utf8')); saved.desired = 'stopped'; await atomicWrite(filename, saved); } catch { /* Keep the original startup error observable. */ }
        child?.kill('SIGTERM');
        throw error;
    } finally { await handle.close().catch(() => {}); await unlink(lock).catch(() => {}); }
}

/** Stop the authenticated daemon; foreground sessions use their own terminal controls. @private */
export async function stopService(workspace: Workspace): Promise<void> {
    const current = await serviceCommand(workspace);
    const record = await readServiceRecord(workspace);
    if (current && record?.mode !== 'daemon') throw new InputError('This project runs in the foreground. Use its terminal controls or Ctrl+C.');
    if (current) await serviceCommand(workspace, 'stop');
    if (record) { record.desired = 'stopped'; await atomicWrite(join(workspace.statePath, 'process.json'), record); }
    const configuration = startupPaths(workspace).configuration;
    try { const saved = JSON.parse(await readFile(configuration, 'utf8')); saved.desired = 'stopped'; await atomicWrite(configuration, saved); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (record?.persistent) await disableStartup(workspace, startupPaths(workspace));
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const active = await serviceCommand(workspace);
        if (active && record && active.id !== record.id) throw new InputError('Project supervisor identity changed while stopping; the new process was preserved.');
        let owned = false;
        try {
            const owner = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(workspace.statePath, 'service-owner.lock')), 'utf8')) as { id?: string; pid?: number };
            if (record && (owner.pid !== record.pid || record.ownerId && owner.id !== record.ownerId)) throw new InputError('Project supervisor ownership changed while stopping; the new process was preserved.');
            owned = true;
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (!active && !owned) break;
        await delay(100);
    }
    if (Date.now() >= deadline) throw new InputError('The authenticated supervisor has not released this project after 30 seconds. Inspect its status before restarting.');
    process.stdout.write(`ptbk stopped: ${workspace.projectPath}\n`);
}
