import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { Workspace } from './domain.js';
import { discoverTasks } from './sources.js';
import { evaluateEligibility } from './schedule.js';
import { runQueue, type RunOptions, type RunResult } from './engine.js';
import { acquireLease, readLedger } from './state.js';
import { confinePath, InputError, resolveAgentSelection } from './workspace.js';
import { redactSecrets, loadProjectSecrets } from './harness.js';

/** Maximum accepted optimistic task-edit payload, in bytes. */
const MAX_BODY = 256 * 1024;

/** Reads a bounded JSON request without trusting Content-Length. */
async function requestBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_BODY) throw new InputError('Request body exceeds 256 KiB.');
        chunks.push(bytes);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

/** Sends JSON with explicit cache and browser security policy. */
function respond(response: ServerResponse, projectPath: string, status: number, value: unknown): void {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(redactSecrets(JSON.stringify(value), projectPath));
}

/** Serves a loopback dashboard and supervises the same finite task engine.
 * @private Internal persistent coder server.
 */
export async function startCoderServer(workspace: Workspace, options: RunOptions & { port?: number; signal?: AbortSignal }): Promise<void> {
    const port = options.port ?? 4441;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new InputError('--port must be between 1 and 65535.');
    const token = randomBytes(32).toString('hex');
    const origin = `http://127.0.0.1:${port}`;
    let isPaused = false;
    let isRunning = false;
    let lastResult: RunResult | undefined;
    const events: unknown[] = [];
    const controller = new AbortController();
    if (options.signal?.aborted) return;
    await loadProjectSecrets(workspace.projectPath);
    const selectedAgent = options.agent ? await resolveAgentSelection(workspace, options.agent) : undefined;
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const server = createServer((request, response) => {
        void (async () => {
            if (request.headers.host !== `127.0.0.1:${port}`) return respond(response, workspace.projectPath, 403, { error: 'Invalid local host.' });
            const url = new URL(request.url || '/', origin);
            if (request.method === 'GET' && url.pathname === '/') {
                response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${token}'; style-src 'nonce-${token}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'` });
                response.end(`<!doctype html><html><head><meta charset="utf-8"><title>ptbk coder</title><style nonce="${token}">body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px;color:#163229;background:#f4f7f4}button{padding:10px;margin-right:8px}article{background:white;border:1px solid #cdd7cf;padding:16px;margin:12px 0}pre{white-space:pre-wrap}small{color:#5b6b62}</style></head><body><h1>ptbk coder</h1><p id="status">Loading queue…</p><button id="pause">Pause</button><button id="resume">Resume</button><button id="stop">Stop</button><div id="tasks"></div><details><summary>Recent events</summary><pre id="events"></pre></details><script nonce="${token}">const token=${JSON.stringify(token)};async function control(action){await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Ptbk-Token':token},body:JSON.stringify({action})});refresh()}document.getElementById('pause').onclick=()=>control('pause');document.getElementById('resume').onclick=()=>control('resume');document.getElementById('stop').onclick=()=>control('stop');async function refresh(){const data=await(await fetch('/api/state',{headers:{'X-Ptbk-Token':token}})).json();document.getElementById('status').textContent=(data.paused?(data.running?'Pause pending; current phase is finishing':'Paused'):data.running?'Running':'Watching queue')+' · '+data.timezone;const root=document.getElementById('tasks');root.replaceChildren();for(const task of data.tasks){const card=document.createElement('article');const heading=document.createElement('strong');heading.textContent=task.title;const state=document.createElement('p');state.textContent=task.status+' · priority '+task.priority+' · '+task.eligibility.kind+': '+task.eligibility.reason;const source=document.createElement('small');source.textContent=task.source.relativePath;const prompt=document.createElement('pre');prompt.textContent=task.payload;card.append(heading,state,source,prompt);root.append(card)}document.getElementById('events').textContent=data.events.map(e=>JSON.stringify(e)).join('\\n')}refresh();setInterval(refresh,1500);</script></body></html>`);
                return;
            }
            if (request.headers['x-ptbk-token'] !== token) return respond(response, workspace.projectPath, 403, { error: 'Session token required.' });
            if (request.method !== 'GET' && request.headers.origin !== origin) return respond(response, workspace.projectPath, 403, { error: 'Local origin required.' });
            if (request.method === 'GET' && url.pathname === '/api/state') {
                const tasks = await discoverTasks(workspace);
                const ledger = await readLedger(workspace);
                respond(response, workspace.projectPath, 200, { paused: isPaused, running: isRunning, timezone: workspace.timezone, lastResult, events, tasks: tasks.map(task => ({ ...task, eligibility: evaluateEligibility(task, { now: Date.now(), timezone: workspace.timezone, harness: options.harness, model: options.model, agent: selectedAgent?.path, agentAliases: selectedAgent?.aliases, minPriority: options.minPriority, maxPriority: options.maxPriority }, ledger.tasks?.[task.id]) })) });
            } else if (request.method === 'POST' && url.pathname === '/api/control') {
                const body = await requestBody(request);
                if (body.action === 'pause') isPaused = true;
                else if (body.action === 'resume') isPaused = false;
                else if (body.action === 'stop') controller.abort();
                else throw new InputError('Expected pause, resume or stop.');
                respond(response, workspace.projectPath, 200, { paused: isPaused });
            } else if (request.method === 'POST' && url.pathname === '/api/task') {
                const body = await requestBody(request);
                if (typeof body.id !== 'string' || typeof body.revision !== 'string' || typeof body.content !== 'string') throw new InputError('id, revision and content are required.');
                const lease = await acquireLease(workspace);
                try {
                    const matches = (await discoverTasks(workspace)).filter(candidate => candidate.id === body.id);
                    const task = matches[0];
                    if (!task) return respond(response, workspace.projectPath, 404, { error: 'Task not found.' });
                    if (matches.length !== 1) return respond(response, workspace.projectPath, 409, { error: 'Task ID is ambiguous; resolve duplicates before editing.' });
                    await confinePath(workspace.projectPath, task.source.path);
                    const previous = await readFile(task.source.path);
                    if (createHash('sha256').update(previous).digest('hex') !== body.revision) return respond(response, workspace.projectPath, 409, { error: 'Source changed; reload before editing.' });
                    const temporary = `${task.source.path}.${randomUUID()}.tmp`;
                    try {
                        await writeFile(temporary, body.content, { flag: 'wx' });
                        await lease.assertOwned();
                        await confinePath(workspace.projectPath, task.source.path);
                        if (!(await readFile(task.source.path)).equals(previous)) return respond(response, workspace.projectPath, 409, { error: 'Source changed while saving; reload before editing.' });
                        await rename(temporary, task.source.path);
                    } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
                    respond(response, workspace.projectPath, 200, { saved: true });
                } finally { await lease.release(); }
            } else respond(response, workspace.projectPath, 404, { error: 'Route not found.' });
        })().catch(error => respond(response, workspace.projectPath, error instanceof InputError ? 400 : 409, { error: String(error.message || error) }));
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    process.stdout.write(`Coder dashboard: ${origin}\n`);
    try {
        while (!controller.signal.aborted) {
            if (!isPaused) {
                isRunning = true;
                try {
                    lastResult = await runQueue(workspace, { ...options, signal: controller.signal, shouldStop: () => isPaused, onEvent: event => { events.push(event); if (events.length > 160) events.shift(); options.onEvent?.(event); } });
                    if (options.gitChanges === 'continue' && lastResult.completed > 0) options = { ...options, gitChanges: 'fail' };
                } catch (error) {
                    isPaused = true;
                    events.push({ type: 'error', message: redactSecrets(String(error), workspace.projectPath) });
                    if (events.length > 160) events.shift();
                    process.stderr.write(`Server paused: ${redactSecrets(String(error), workspace.projectPath)}\n`);
                } finally { isRunning = false; }
            }
            await delay(1000, undefined, { signal: controller.signal }).catch(() => {});
        }
    } finally {
        options.signal?.removeEventListener('abort', onAbort);
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
}
