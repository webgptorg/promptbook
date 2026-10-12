import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer as createSocket } from 'node:net';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { startCoderServer } from '../dist/coder/server.js';
import { ensureCoreAgents } from '../dist/coder/agents.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { readServiceRecord } from '../dist/coder/service.js';

/** Local fixture Git calls never execute a shell or touch the checkout under test. */
const run = promisify(execFile);

/** Wait for an observable boundary with a finite deadline and the last returned state on failure. */
async function until(read, accepts, description, timeout = 60000) {
    const deadline = Date.now() + timeout; let value;
    do {
        value = await read();
        if (accepts(value)) return value;
        await delay(100);
    } while (Date.now() < deadline);
    assert.fail(`${description}: ${JSON.stringify(value)}`);
}

/** Reserve then release a loopback port for a real HTTP integration test. */
async function freePort() {
    const socket = createSocket();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    return port;
}

/** A single future Book prevents any paid inference during protected API tests. */
function taskBook(id = 'future', after = '2099-01-01T00:00Z') {
    return `TASK Future work\nTASK ID ${id}\n${after ? `TASK AFTER ${after}\n` : ''}\nImplement fixture work.\n`;
}

/** Start the persistent supervisor over a committed, disposable project. */
async function fixture(t, options = {}) {
    const project = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ptbk-server-')));
    await run('git', ['-C', project, 'init', '--quiet']);
    await run('git', ['-C', project, 'config', 'user.name', 'Fixture']);
    await run('git', ['-C', project, 'config', 'user.email', 'fixture@example.test']);
    await run('git', ['-C', project, 'config', 'commit.gpgsign', 'false']);
    await run('git', ['-C', project, 'config', 'core.autocrlf', 'false']);
    await mkdir(path.join(project, 'tasks'));
    await mkdir(path.join(project, 'agents'));
    await writeFile(path.join(project, '.gitignore'), '.ptbk/\n');
    await writeFile(path.join(project, 'agents', 'developer.book'), 'Developer\nFROM VOID\nRULE Implement the fixture.\nCLOSED\n');
    await writeFile(path.join(project, 'tasks', 'future.book'), taskBook());
    await ensureCoreAgents(project);
    await run('git', ['-C', project, 'add', '.gitignore', 'agents', 'tasks']);
    await run('git', ['-C', project, 'commit', '--quiet', '-m', 'Fixture baseline']);
    const workspace = await resolveWorkspace({ path: project });
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const controller = new AbortController();
    let calls = 0;
    const completion = startCoderServer(workspace, {
        port, signal: controller.signal, harness: 'openai-codex', gitChanges: 'fail',
        runHarness: async (request) => { calls++; await writeFile(path.join(request.projectPath, 'output.txt'), 'Implemented'); return { outcome: 'success', exitCode: 0, output: 'Fixture completed.' }; },
        ...options,
    });
    t.after(async () => { controller.abort(); await completion; await rm(project, { recursive: true, force: true }); });
    const html = await until(async () => { try { return await (await fetch(origin)).text(); } catch { return undefined; } }, Boolean, 'Server started', 30000);
    const token = (await readServiceRecord(workspace)).token;
    const fixtureResult = {
        project, workspace, origin, token, html, controller, completion, calls: () => calls,
        request: (route, body, headers = {}) => fetch(`${origin}${route}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { 'X-Ptbk-Token': token, ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }), ...headers },
            ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        }),
    };
    fixtureResult.pause = async () => {
        await fixtureResult.request('/api/control', { action: 'pause' });
        await until(async () => (await fixtureResult.request('/api/state')).json(), state => !state.running, 'Server paused after its current finite queue finished');
    };
    return fixtureResult;
}

test('dashboard has valid inert rendering and protected API rejects missing token, host and origin', async (t) => {
    const server = await fixture(t);
    const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(server.html)[1];
    assert.doesNotThrow(() => new Function(script));
    assert(!server.html.includes(server.token), 'Public HTML never reveals the runtime control capability');
    assert(!(await fetch(server.origin)).headers.get('content-security-policy').includes(server.token));
    assert.equal((await fetch(`${server.origin}/api/state`)).status, 403);
    const forgedHostStatus = await new Promise((resolve, reject) => {
        const request = httpRequest(`${server.origin}/api/state`, { headers: { Host: 'attacker.example', 'X-Ptbk-Token': server.token } }, (response) => { response.resume(); resolve(response.statusCode); });
        request.on('error', reject); request.end();
    });
    assert.equal(forgedHostStatus, 403);
    assert.equal((await server.request('/api/control', { action: 'pause' }, { Origin: 'https://attacker.example' })).status, 403);
    const control = await server.request('/api/control', { action: 'pause' });
    assert.equal(control.status, 200);
    assert.equal((await control.json()).paused, true);
    const state = await (await server.request('/api/state')).json();
    assert.equal(state.tasks[0].eligibility.kind, 'waiting-until');
    assert.equal(server.calls(), 0);
});

test('optimistic task edits preserve source on stale revision and reject unbounded or malformed input', async (t) => {
    const server = await fixture(t);
    await server.pause();
    const [task] = (await (await server.request('/api/state')).json()).tasks;
    const previous = await readFile(task.source.path, 'utf8');
    const stale = await server.request('/api/task', { id: task.id, revision: 'wrong', content: 'Do not save' });
    assert.equal(stale.status, 409);
    assert.equal(await readFile(task.source.path, 'utf8'), previous);
    const valid = await server.request('/api/task', { id: task.id, revision: task.source.revision, content: previous.replace('Future work', 'Edited future work') });
    assert.equal(valid.status, 200, await valid.text());
    assert.match(await readFile(task.source.path, 'utf8'), /^TASK Edited future work/);
    assert.equal((await server.request('/api/control', '{malformed')).status >= 400, true);
    assert.equal((await server.request('/api/task', { id: task.id, revision: task.source.revision, content: 'x'.repeat(300000) })).status, 400);
    assert.equal(server.calls(), 0);
});

test('server mutation and discovery refuse task symlink escapes and ambiguous IDs', async (t) => {
    const server = await fixture(t);
    await server.pause();
    const [task] = (await (await server.request('/api/state')).json()).tasks;
    await writeFile(path.join(server.project, 'tasks', 'duplicate.book'), taskBook());
    const duplicate = await server.request('/api/task', { id: task.id, revision: task.source.revision, content: taskBook('replacement') });
    assert.equal(duplicate.status, 409);
    await rm(path.join(server.project, 'tasks', 'duplicate.book'));
    const external = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ptbk-server-external-')));
    t.after(() => rm(external, { recursive: true, force: true }));
    const outside = path.join(external, 'outside.book');
    await writeFile(outside, taskBook('external'));
    await rm(task.source.path);
    await symlink(outside, task.source.path);
    const escaped = await server.request('/api/task', { id: task.id, revision: task.source.revision, content: 'Attacker replacement' });
    assert.equal(escaped.status >= 400, true);
    assert.equal(await readFile(outside, 'utf8'), taskBook('external'));
});

test('persistent server executes through the shared engine after source change and retains actual outcomes', async (t) => {
    const server = await fixture(t);
    await server.pause();
    const source = path.join(server.project, 'tasks', 'future.book');
    await writeFile(source, taskBook('future', ''));
    await run('git', ['-C', server.project, 'add', 'tasks/future.book']);
    await run('git', ['-C', server.project, 'commit', '--quiet', '-m', 'Make fixture due']);
    await server.request('/api/control', { action: 'resume' });
    const state = await until(async () => (await server.request('/api/state')).json(), state => state.tasks[0].status === 'done', 'Server completed the due task');
    assert.equal(state.tasks[0].status, 'done', JSON.stringify(state.events));
    assert.equal(server.calls(), 1);
    assert.equal(await readFile(path.join(server.project, 'output.txt'), 'utf8'), 'Implemented');
    assert.ok(state.events.some((event) => event.type === 'checks-skipped'));
    await delay(1200);
    assert.equal(server.calls(), 1, 'Idle and completed definitions do not make another model call');
    assert.equal((await server.request('/api/control', { action: 'stop' })).status, 200);
    await server.completion;
});

test('server continue recovers once then watches and executes work added on a later poll', async t => {
    const { chmod } = await import('node:fs/promises');
    const { runQueue } = await import('../dist/coder/engine.js');
    const project = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ptbk-server-continue-')));
    await run('git', ['-C', project, 'init', '--quiet']);
    await run('git', ['-C', project, 'config', 'user.name', 'Fixture']);
    await run('git', ['-C', project, 'config', 'user.email', 'fixture@example.test']);
    await run('git', ['-C', project, 'config', 'commit.gpgsign', 'false']);
    await run('git', ['-C', project, 'config', 'core.autocrlf', 'false']);
    await mkdir(path.join(project, 'tasks')); await mkdir(path.join(project, 'agents'));
    await writeFile(path.join(project, '.gitignore'), '.ptbk/\n');
    await writeFile(path.join(project, 'agents', 'developer.book'), 'Developer\nFROM VOID\nRULE Implement the fixture.\nCLOSED\n');
    await writeFile(path.join(project, 'tasks', 'interrupted.book'), taskBook('interrupted', ''));
    await ensureCoreAgents(project);
    await run('git', ['-C', project, 'add', '--', '.gitignore', 'agents', 'tasks']);
    await run('git', ['-C', project, 'commit', '--quiet', '-m', 'Interrupted server fixture']);
    const workspace = await resolveWorkspace({ path: project }); let calls = 0;
    const provider = async request => {
        calls++; await writeFile(path.join(request.projectPath, 'output.txt'), `Implementation ${calls}\n`);
        return { outcome: 'success', exitCode: 0, output: 'Fixture completed.' };
    };
    const hook = path.join(project, '.git', 'hooks', 'pre-commit');
    await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    assert.equal((await runQueue(workspace, { harness: 'openai-codex', runHarness: provider })).failed, 1);
    await rm(hook);
    const port = await freePort(); const origin = `http://127.0.0.1:${port}`; const controller = new AbortController();
    const completion = startCoderServer(workspace, { port, signal: controller.signal, harness: 'openai-codex', gitChanges: 'continue', runHarness: provider });
    t.after(async () => { controller.abort(); await completion; await rm(project, { recursive: true, force: true }); });
    const html = await until(async () => { try { return await (await fetch(origin)).text(); } catch { return undefined; } }, Boolean, 'Recovery server started', 30000);
    const token = (await readServiceRecord(workspace)).token;
    const request = (route, body) => fetch(`${origin}${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'X-Ptbk-Token': token, ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let state = await until(async () => (await request('/api/state')).json(), state => !state.running && state.tasks[0].status === 'done', 'Server recovered the accepted occurrence');
    assert.equal(state.tasks[0].status, 'done', JSON.stringify(state.events)); assert.equal(calls, 1, 'Recovery does not repeat successful inference');
    await delay(1200);
    state = await (await request('/api/state')).json();
    assert.equal(state.paused, false, JSON.stringify(state.events));
    assert.ok(!state.events.some(event => /Continue requires exactly one/.test(event.message)));
    await request('/api/control', { action: 'pause' });
    state = await until(async () => (await request('/api/state')).json(), state => !state.running, 'Server paused after recovery');
    await writeFile(path.join(project, 'tasks', 'later.book'), taskBook('later', ''));
    await ensureCoreAgents(project);
    await run('git', ['-C', project, 'add', '--', 'tasks/later.book']);
    await run('git', ['-C', project, 'commit', '--quiet', '-m', 'New work after recovery']);
    await request('/api/control', { action: 'resume' });
    state = await until(async () => (await request('/api/state')).json(), state => !state.running && state.tasks.find(task => task.id === 'later')?.status === 'done', 'Server completed work added after recovery');
    assert.equal(state.tasks.find(task => task.id === 'later')?.status, 'done', JSON.stringify(state.events));
    assert.equal(calls, 2); assert.equal(state.paused, false);
});
