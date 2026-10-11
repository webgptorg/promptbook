import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer as createSocket, connect } from 'node:net';
import { hostname, tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { git, captureSnapshot } from '../dist/coder/git.js';
import { checksum, discoverTasks } from '../dist/coder/sources.js';
import { createRequest, listRequests, answerRequest, waitForAnswer } from '../dist/coder/requests.js';
import { openDashboard, runService, startService, stopService, serviceCommand, readServiceRecord } from '../dist/coder/service.js';
import { startupRegistration } from '../dist/coder/persistence.js';
import { runQueue } from '../dist/coder/engine.js';
import { ensureCoreAgents } from '../dist/coder/agents.js';
import { processBirth } from '../dist/coder/state.js';

/** Produce an isolated committed project with offline agents and a successful checker. */
async function fixture(t, content = '', nested = '') {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), 'ptbk-service-')));
    const projectPath = path.join(root, nested);
    await mkdir(projectPath, { recursive: true });
    const cleanups = [];
    t.after(async () => { try { for (const cleanup of cleanups.reverse()) await cleanup(); } finally { await rm(root, { recursive: true, force: true }); } });
    await git(projectPath, ['init', '--quiet']);
    await git(projectPath, ['config', 'user.name', 'Service Fixture']);
    await git(projectPath, ['config', 'user.email', 'fixture@example.test']);
    await git(projectPath, ['config', 'commit.gpgsign', 'false']);
    await mkdir(path.join(projectPath, 'agents', '.core'), { recursive: true });
    await mkdir(path.join(projectPath, 'tasks'));
    await mkdir(path.join(projectPath, 'prompts'));
    await writeFile(path.join(projectPath, '.gitignore'), '.ptbk/\n');
    await writeFile(path.join(projectPath, 'agents', 'developer.book'), 'Developer\nFROM VOID\nGOAL Maintain this fixture.\nCLOSED\n');
    await writeFile(path.join(projectPath, 'agents', '.core', 'manager.book'), 'Manager\nFROM VOID\nRULE Assign existing work only.\nCLOSED\n');
    await writeFile(path.join(projectPath, 'check.cjs'), '// A successful offline fixture checker.\n');
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ scripts: { check: 'node check.cjs' } }));
    await writeFile(path.join(projectPath, 'code.txt'), 'baseline\n');
    if (content) await writeFile(path.join(projectPath, 'tasks', 'target.book'), content);
    await git(projectPath, ['add', '--', '.gitignore', 'agents', 'tasks', 'check.cjs', 'package.json', 'code.txt']);
    await git(projectPath, ['commit', '-qm', 'Service fixture baseline']);
    return { projectPath, gitRoot: projectPath, tasksPath: path.join(projectPath, 'tasks'), legacyPath: path.join(projectPath, 'prompts'), statePath: path.join(projectPath, '.ptbk'), timezone: 'UTC', cleanups };
}

/** A deterministic authenticated inventory never invokes an installed provider. */
async function inventory() {
    return [{ name: 'openai-codex', executable: 'fixture', installed: true, authenticated: true, usable: true, authentication: 'account', models: ['fixture-model'], thinkingLevels: ['high'], capabilities: { team: true, readOnly: true }, diagnostic: 'Offline fixture inventory', install: '', login: '' }];
}

/** Wait for observable conditions without calling models or changing sources. */
async function until(read, predicate, label, milliseconds = 30000) {
    const deadline = Date.now() + milliseconds;
    let value;
    while (Date.now() < deadline) { value = await read(); if (predicate(value)) return value; await delay(25); }
    assert.fail(`${label}: ${JSON.stringify(value)}`);
}

/** Operate the real supervisor with bounded lifecycle cleanup and injected offline dependencies. */
async function supervise(t, workspace, options = {}) {
    const controller = new AbortController();
    let ready;
    const confirmed = new Promise(resolve => { ready = resolve; });
    const completion = runService(workspace, { mode: 'raw', noPersist: true, noQr: true, noServer: true, automatic: false, signal: controller.signal, inspectHarnesses: inventory, onReady: ready, ...options });
    workspace.cleanups.push(async () => { controller.abort(); await completion; });
    await Promise.race([confirmed, completion.then(() => { throw new Error('Supervisor stopped before ready'); })]);
    return { controller, completion, inspect: () => serviceCommand(workspace), command: (action, input) => serviceCommand(workspace, action, input) };
}

test('durable requests resolve once across channels and reject invalid status without consuming the answer', async t => {
    const workspace = await fixture(t);
    assert.deepEqual(await listRequests(workspace), []);
    await assert.rejects(readdir(workspace.statePath));
    const request = await createRequest(workspace, { kind: 'confirmation', taskId: 'fixture', reason: 'A decision is needed.', prompt: 'Approve the fixture?' });
    assert.equal((await createRequest(workspace, { kind: 'confirmation', taskId: 'fixture', reason: 'A decision is needed.', prompt: 'Approve the fixture?' })).id, request.id);
    await assert.rejects(answerRequest(workspace, request.id, 'yes', 'pending'), /status/);
    const server = await supervise(t, workspace);
    assert.equal((await server.inspect()).requests[0].id, request.id);
    await server.command('answer', { id: request.id, response: 'yes' });
    assert.equal(await waitForAnswer(workspace, request.id), 'yes');
    assert.deepEqual((await server.inspect()).requests, []);
    await assert.rejects(server.command('answer', { id: request.id, response: 'no' }), /already answered/);
    const second = await createRequest(workspace, { kind: 'question', reason: 'Two channels may reply.', prompt: 'Choose one value.' });
    const answers = await Promise.allSettled([answerRequest(workspace, second.id, 'first'), answerRequest(workspace, second.id, 'second')]);
    assert.equal(answers.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await listRequests(workspace, true)).length, 0);
    const rejected = await createRequest(workspace, { kind: 'action', reason: 'A human action is required.', prompt: 'Can you perform it?' });
    await answerRequest(workspace, rejected.id, 'Unable to perform it', 'rejected');
    await assert.rejects(waitForAnswer(workspace, rejected.id), /rejected/);
    await server.command('stop'); await server.completion;
    assert.equal((await readServiceRecord(workspace)).desired, 'stopped');
});

test('dashboard script is valid and all shared controls require the local session, host and origin', async t => {
    const workspace = await fixture(t);
    const calls = [];
    const token = randomUUID();
    const page = await openDashboard(workspace, { token, snapshot: async () => ({ project: workspace.projectPath, tasks: [], requests: [], events: [] }), command: async (action, input) => { calls.push({ action, input }); return { applied: true }; } });
    t.after(() => page.close());
    const html = await (await fetch(page.url)).text();
    assert.doesNotThrow(() => new Function(/<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)[1]));
    assert.equal((await fetch(`${page.url}/api/state`)).status, 403);
    assert.equal((await fetch(`${page.url}/api/state`, { headers: { 'X-Ptbk-Token': 'é'.repeat(token.length) } })).status, 403);
    const headers = { 'X-Ptbk-Token': token, Origin: page.url, 'Content-Type': 'application/json' };
    assert.equal((await fetch(`${page.url}/api/control`, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.test' }, body: '{"action":"stop"}' })).status, 403);
    assert.equal((await fetch(`${page.url}/api/control`, { method: 'POST', headers, body: '{malformed' })).status, 400);
    assert.equal((await fetch(`${page.url}/api/task`, { method: 'POST', headers, body: JSON.stringify({ id: 'example', revision: 'expected', content: 'TASK Edited' }) })).status, 200);
    assert.equal(calls[0].action, 'edit-task');
    assert.equal((await fetch(`${page.url}/api/control`, { method: 'POST', headers, body: JSON.stringify({ action: 'settings', padding: 'x'.repeat(300000) }) })).status, 400);
    assert.equal(calls.length, 1);
});

test('shared supervisor controls protect optimistic edits and distinguish live settings from restart settings', async t => {
    const workspace = await fixture(t, 'TASK Future work\nTask description.\nTASK ID future\nTASK AFTER 2099-01-01T00:00Z\n');
    const server = await supervise(t, workspace);
    await server.command('pause');
    const [task] = (await server.inspect()).tasks;
    assert.equal(task.eligibility.kind, 'waiting-until');
    assert.match(task.payload, /Task description/);
    const source = await readFile(task.source.path, 'utf8');
    await assert.rejects(server.command('edit-task', { id: task.id, revision: 'wrong', content: 'TASK Wrong' }), /Source changed/);
    assert.equal(await readFile(task.source.path, 'utf8'), source);
    await server.command('edit-task', { id: task.id, revision: task.source.revision, content: source.replace('Future work', 'Edited future work') });
    assert.match(await readFile(task.source.path, 'utf8'), /^TASK Edited future work/);
    await assert.rejects(server.command('settings', { settings: { noQuestions: 'false' } }), /boolean/);
    await assert.rejects(server.command('settings', { settings: { unknownSetting: true } }), /Unknown/);
    const updated = await server.command('settings', { settings: { waitAfterPrompt: 1234, noServer: false, port: 4999 } });
    assert.equal(updated.active.waitAfterPrompt, 1234);
    assert.equal(updated.active.noServer, true);
    assert.deepEqual(updated.requiresRestart, { noServer: false, port: 4999 });
    assert.equal((await server.inspect()).paused, true);
    const record = await readServiceRecord(workspace);
    const invalidReply = await new Promise((resolve, reject) => {
        const client = connect(record.endpoint, () => client.write(`${JSON.stringify({ identity: record.id, token: 'wrong', action: 'resume' })}\n`));
        let data = ''; client.on('data', chunk => { data += chunk; }); client.on('end', () => resolve(JSON.parse(data))); client.on('error', reject);
    });
    assert.match(invalidReply.error, /identity\/token/);
    assert.equal((await server.inspect()).paused, true);
});

test('settings changed during a task wait for a safe boundary and retain the active provider configuration', async t => {
    const workspace = await fixture(t, 'TASK Implement fixture\nImplement one change.\nTASK ID fixture\nTASK AGENT @Developer\nTASK HARNESS openai-codex\n');
    let started;
    const entered = new Promise(resolve => { started = resolve; });
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const seen = [];
    const server = await supervise(t, workspace, { model: 'fixture-model', runHarness: async request => { seen.push(request.model); started(); await held; await writeFile(path.join(request.projectPath, 'code.txt'), 'implemented\n'); return { outcome: 'success', exitCode: 0, output: 'Offline change accepted.' }; } });
    workspace.cleanups.push(async () => release());
    await entered;
    const update = await server.command('settings', { settings: { model: 'next-model' } });
    assert.equal(update.active.model, 'fixture-model');
    assert.equal(update.pending.model, 'next-model');
    assert.equal((await server.command('pause')).pausePending, true);
    release();
    const state = await until(server.inspect, value => !value.running && value.settings.model === 'next-model', 'Pending settings applied');
    assert.equal(state.paused, true);
    assert.deepEqual(seen, ['fixture-model']);
    assert.equal(state.statistics.completed, 1);
});

test('automatic start executes its visible Manager prerequisite before the target and commits generated sources', async t => {
    const workspace = await fixture(t, 'TASK Bounded change\nImplement the fixture change.\nTASK ID target\n');
    const calls = [];
    const server = await supervise(t, workspace, { automatic: true, runHarness: async request => {
        calls.push(request.taskId);
        if (request.agentPath.endsWith('manager.book')) {
            const filename = path.join(request.projectPath, 'tasks', 'target.book');
            await writeFile(filename, `${await readFile(filename, 'utf8')}TASK AGENT @Developer\nTASK HARNESS openai-codex\n`);
        } else await writeFile(path.join(request.projectPath, 'code.txt'), 'implemented\n');
        return { outcome: 'success', exitCode: 0, output: 'Verified the requested fixture result.', acceptance: { satisfied: true, evidence: 'The requested fixture files were checked.' } };
    } });
    const state = await until(server.inspect, value => value.tasks.find(task => task.id === 'target')?.status === 'done', 'Manager and target completed', 60000);
    await server.command('pause');
    await until(server.inspect, value => !value.running, 'Manager queue paused');
    assert.equal(calls.length, 2, JSON.stringify(state.events));
    const tasks = await discoverTasks(workspace);
    const manager = tasks.find(task => task.origin === 'engine:assignment:target');
    assert.equal(manager.status, 'done');
    assert.equal(manager.parent, '#target');
    assert.deepEqual(tasks.find(task => task.id === 'target').dependencies, [`#${manager.id}`]);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('automatic Markdown routing is an ordinary Manager result and keeps the legacy source format', async t => {
    const workspace = await fixture(t);
    const filename = path.join(workspace.legacyPath, 'work.md');
    const original = '[ ] !!\nLegacy bounded work\n';
    await writeFile(filename, original);
    await git(workspace.gitRoot, ['add', '--', 'prompts/work.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Legacy task source']);
    const [legacy] = await discoverTasks(workspace);
    const calls = [];
    const server = await supervise(t, workspace, { automatic: true, runHarness: async request => {
        calls.push(request.taskId);
        if (request.agentPath.endsWith('manager.book')) {
            const directory = path.join(request.projectPath, 'tasks', 'routing');
            await mkdir(directory, { recursive: true });
            await writeFile(path.join(directory, `${legacy.id}.json`), JSON.stringify({ version: 1, taskId: legacy.id, sourcePayloadChecksum: checksum(legacy.payload), agent: 'Developer', harness: 'openai-codex' }));
        } else await writeFile(path.join(request.projectPath, 'code.txt'), 'legacy implemented\n');
        return { outcome: 'success', exitCode: 0, output: 'Verified the requested fixture result.', acceptance: { satisfied: true, evidence: 'Legacy routing or implementation was verified.' } };
    } });
    const state = await until(server.inspect, value => value.tasks.find(task => task.id === legacy.id)?.status === 'done', 'Legacy task completed', 15000);
    await server.command('pause');
    await until(server.inspect, value => !value.running, 'Legacy queue paused');
    assert.equal(calls.length, 2, JSON.stringify(state.events));
    assert.equal(await readFile(filename, 'utf8'), original.replace('[ ]', '[x]'));
    assert.equal((await discoverTasks(workspace)).filter(task => task.source.format === 'markdown').length, 1);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('automatic goal enquiry observes backlog and durable cooldown while unavailable explicit routing stays blocked', async t => {
    const workspace = await fixture(t, 'TASK Future backlog\nTASK ID future\nTASK AFTER 2099-01-01T00:00Z\n');
    let calls = 0;
    const first = await supervise(t, workspace, { automatic: true, runHarness: async () => { calls++; throw new Error('No paid or fixture inference is authorized for future backlog'); } });
    await delay(1100);
    assert.equal(calls, 0);
    assert.equal((await discoverTasks(workspace)).length, 1);
    await first.command('stop'); await first.completion;
    await rm(path.join(workspace.tasksPath, 'target.book')); await git(workspace.gitRoot, ['add', '--', 'tasks/target.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Remove future backlog']);
    const second = await supervise(t, workspace, { automatic: true, runHarness: async () => { calls++; return { outcome: 'success', exitCode: 0, output: 'No additional work is justified by the fixture.', acceptance: { satisfied: true, evidence: 'Existing goals were reviewed without fabricating work.' } }; } });
    await until(second.inspect, value => value.tasks.some(task => task.status === 'done'), 'Goal enquiry completed');
    await second.command('pause');
    await until(second.inspect, value => !value.running, 'Goal enquiry paused');
    const generated = await discoverTasks(workspace);
    assert.equal(generated.length, 1);
    assert.match(generated[0].origin, /^engine:goal-enquiry:Developer$/);
    assert.equal(calls, 1);
    const cooldown = JSON.parse(await readFile(path.join(workspace.statePath, 'discovery.json'), 'utf8'));
    assert.ok(cooldown.nextAt > Date.now());
    await second.command('stop'); await second.completion;
    const third = await supervise(t, workspace, { automatic: true, runHarness: async () => { calls++; throw new Error('Cooldown must prevent another enquiry'); } });
    await delay(1100);
    assert.equal(calls, 1);
    await third.command('pause');
    await writeFile(path.join(workspace.tasksPath, 'blocked.book'), 'TASK Explicit unavailable harness\nTASK ID blocked\nTASK AGENT @Developer\nTASK HARNESS claude-code\n');
    const state = await third.inspect();
    assert.equal(state.tasks.find(task => task.id === 'blocked').eligibility.kind, 'blocked');
    assert.match(state.tasks.find(task => task.id === 'blocked').eligibility.reason, /unavailable/);
});

test('startup registration previews pin one project and installation without registering OS services', async t => {
    const workspace = await fixture(t);
    const special = { ...workspace, projectPath: `${workspace.projectPath}/space & $literal%`, statePath: `${workspace.statePath}/space & $literal%` };
    const paths = { node: '/runtime with spaces/node', worker: '/installed/$literal%/service-worker.js', configuration: `${special.statePath}/service-config.json` };
    const linux = startupRegistration(special, paths, 'linux', '/fixture-home');
    assert.match(linux.content, /ExecStart=.*\$\$literal%%/);
    assert.match(linux.content, /WorkingDirectory=.*\$literal%%/);
    assert.match(linux.content, /--resume/);
    const mac = startupRegistration(special, paths, 'darwin', '/fixture-home');
    assert.match(mac.content, /space &amp; \$literal%/);
    assert.match(mac.path, /Library\/LaunchAgents/);
    const windows = startupRegistration(special, paths, 'win32', '/fixture-home');
    assert.match(windows.content, /InteractiveToken/);
    assert.match(windows.content, /ExecutionTimeLimit>PT0S/);
    assert.equal(windows.name, startupRegistration(special, paths, 'win32', '/fixture-home').name);
    assert.throws(() => startupRegistration(special, paths, 'freebsd', '/fixture-home'), /unsupported/);
});

test('failed automatic persistence recovery waits for review without repeating inference or spinning retries', async t => {
    const workspace = await fixture(t, 'TASK Recover fixture\nImplement one change.\nTASK ID recovery\nTASK AGENT @Developer\nTASK HARNESS openai-codex\n');
    await ensureCoreAgents(workspace.projectPath);
    await git(workspace.gitRoot, ['add', '--', 'agents']); await git(workspace.gitRoot, ['commit', '-qm', 'Initialize fixture core roles']);
    await mkdir(workspace.statePath, { recursive: true });
    const hook = path.join(workspace.gitRoot, '.git', 'hooks', 'pre-commit');
    await writeFile(hook, '#!/bin/sh\nprintf x >> .ptbk/hook-count\nexit 1\n'); await chmod(hook, 0o755);
    let calls = 0;
    const provider = async request => { calls++; await writeFile(path.join(request.projectPath, 'code.txt'), 'recovery work\n'); return { outcome: 'success', exitCode: 0, output: 'Fixture implementation completed.' }; };
    assert.equal((await runQueue(workspace, { harness: 'openai-codex', runHarness: provider })).failed, 1);
    assert.equal(calls, 1);
    const server = await supervise(t, workspace, { runHarness: provider, waitAfterError: 10000 });
    await until(server.inspect, value => ['blocked', 'recovery-required', 'waiting'].includes(value.status) && value.requests.length > 0, 'Failed recovery is visible');
    const count = await readFile(path.join(workspace.statePath, 'hook-count'), 'utf8');
    await delay(1200);
    assert.equal(calls, 1, 'Successful inference is not repeated by automatic recovery');
    assert.equal(await readFile(path.join(workspace.statePath, 'hook-count'), 'utf8'), count, 'Failed persistence retries wait for a safe review boundary');
});

test('a real detached daemon starts and stops in a deeply nested project with spaces', async t => {
    const workspace = await fixture(t, 'TASK Future fixture\nTASK ID future\nTASK AFTER 2099-01-01T00:00Z\n', 'long project path '.repeat(12).trimEnd());
    workspace.cleanups.push(() => stopService(workspace));
    const started = await startService(workspace, { mode: 'daemon', noPersist: true, noQr: true, noServer: true, automatic: false, inspectHarnesses: inventory });
    assert.equal(started.mode, 'daemon');
    assert.equal(started.persistent, false);
    const record = await readServiceRecord(workspace);
    assert.equal((await serviceCommand(workspace)).id, record.id);
    if (process.platform !== 'win32') {
        assert.ok(Buffer.byteLength(record.endpoint) < 100);
        const directory = await lstat(path.dirname(record.endpoint));
        assert.equal(directory.isDirectory(), true);
        assert.equal(directory.uid, process.getuid());
        assert.equal(directory.mode & 0o777, 0o700);
    }
    await stopService(workspace);
    assert.equal(await serviceCommand(workspace), undefined);
    assert.equal((await readServiceRecord(workspace)).desired, 'stopped');
});

test('shared skip-wait advances supervisor pacing while task dates remain authoritative', async t => {
    const workspace = await fixture(t, 'TASK First fixture\nTASK ID first\nTASK AGENT @Developer\nTASK HARNESS openai-codex\nTASK PRIORITY 2\n');
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'TASK Second fixture\nTASK ID second\nTASK AGENT @Developer\nTASK HARNESS openai-codex\nTASK PRIORITY 1\n');
    await writeFile(path.join(workspace.tasksPath, 'future.book'), 'TASK Future fixture\nTASK ID future\nTASK AFTER 2099-01-01T00:00Z\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks']); await git(workspace.gitRoot, ['commit', '-qm', 'Pacing fixture agenda']);
    const calls = [];
    const server = await supervise(t, workspace, { waitBetweenPrompts: 10000, waitAfterPrompt: 10000, runHarness: async request => { calls.push(request.taskId); await writeFile(path.join(request.projectPath, 'code.txt'), `${request.taskId}\n`); return { outcome: 'success', exitCode: 0, output: 'Offline result complete.' }; } });
    await until(server.inspect, state => state.statistics.completed === 1 && !state.running, 'First paced task completed');
    await delay(1100);
    assert.deepEqual(calls, ['first']);
    assert.equal((await server.command('skip-wait')).skipped, true);
    await until(server.inspect, state => state.statistics.completed === 2 && !state.running, 'Second task started after shared skip');
    await server.command('pause');
    const state = await server.inspect();
    assert.deepEqual(calls, ['first', 'second']);
    assert.equal(state.tasks.find(task => task.id === 'future').eligibility.kind, 'waiting-until');
});

test('raw mode reports an active human request and keeps ordinary unsupported-tool harnesses usable', async t => {
    const workspace = await fixture(t, 'TASK Human-reviewed fixture\nTASK ID human\nTASK AGENT @Developer\nTASK HARNESS cline\n');
    let output = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = function(chunk, ...args) { output += String(chunk); return originalWrite.call(this, chunk, ...args); };
    workspace.cleanups.push(() => { process.stdout.write = originalWrite; });
    let asked;
    const entered = new Promise(resolve => { asked = resolve; });
    const server = await supervise(t, workspace, { noQuestions: true, runHarness: async invocation => {
        assert.equal(invocation.tools, undefined, 'Cline receives no unverified host browser tools for an ordinary task');
        const request = await createRequest(workspace, { kind: 'question', taskId: invocation.taskId, activityId: invocation.occurrenceId, reason: 'The offline fixture needs a human answer.', prompt: 'Which fixture value should be written?' });
        asked(request);
        const response = await waitForAnswer(workspace, request.id, invocation.signal);
        await writeFile(path.join(invocation.projectPath, 'code.txt'), `${response}\n`);
        return { outcome: 'success', exitCode: 0, output: 'Human response applied to fixture.' };
    } });
    const request = await entered;
    await until(async () => output, value => value.includes(`Pending request ${request.id}`) && value.includes(`ptbk answer "${request.id}"`), 'Raw mode explains how to answer without reading stdin');
    await server.command('answer', { id: request.id, response: 'reviewed' });
    await until(server.inspect, state => state.statistics.completed === 1 && !state.running, 'Active task received the shared durable answer');
    await server.command('pause');
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'reviewed\n');
});

test('supervisor ownership detects PID reuse while live, unknown and remote identities stay protected', async t => {
    const workspace = await fixture(t);
    await mkdir(workspace.statePath, { recursive: true });
    const filename = path.join(workspace.statePath, 'service-owner.lock');
    const birth = await processBirth(process.pid);
    assert.ok(birth, 'The fixture must be able to verify its own process birth');
    const owner = { version: 1, id: randomUUID(), pid: process.pid, birth, host: hostname() };
    await writeFile(filename, JSON.stringify({ ...owner, birth: `earlier-process:${birth}` }));
    const server = await supervise(t, workspace);
    const claimed = JSON.parse(await readFile(filename, 'utf8'));
    assert.notEqual(claimed.id, owner.id);
    assert.equal(claimed.pid, process.pid);
    assert.equal(claimed.birth, birth);
    assert.equal(claimed.host, hostname());
    await server.command('stop'); await server.completion;
    const options = { mode: 'raw', noPersist: true, noServer: true, automatic: false };
    for (const [protectedOwner, reason] of [[owner, /already owns.*birth matches/], [{ ...owner, birth: undefined }, /no verifiable process birth/], [{ ...owner, host: `another-host:${hostname()}` }, /another host/]]) {
        const original = JSON.stringify(protectedOwner);
        await writeFile(filename, original);
        await assert.rejects(runService(workspace, options), reason);
        assert.equal(await readFile(filename, 'utf8'), original, 'Unproven ownership is preserved without signaling or replacing its process');
    }
});

test('stale supervisor takeovers serialize and preserve orphaned recovery ownership', async t => {
    const workspace = await fixture(t);
    await mkdir(workspace.statePath, { recursive: true });
    const filename = path.join(workspace.statePath, 'service-owner.lock');
    const recoveryDirectory = path.join(workspace.statePath, 'service-owner-recovery.lock');
    const birth = await processBirth(process.pid);
    assert.ok(birth);
    const stale = JSON.stringify({ version: 1, id: randomUUID(), pid: process.pid, birth: `earlier-process:${birth}`, host: hostname() });
    await writeFile(filename, stale);
    await mkdir(recoveryDirectory, { mode: 0o700 });
    const orphan = JSON.stringify({ id: 'interrupted-recovery', pid: process.pid, birth, host: hostname() });
    await writeFile(path.join(recoveryDirectory, 'owner.json'), orphan);
    const options = { mode: 'raw', noPersist: true, noServer: true, automatic: false };
    await assert.rejects(runService(workspace, options), /recovery is locked.*Inspect/);
    assert.equal(await readFile(filename, 'utf8'), stale);
    assert.equal(await readFile(path.join(recoveryDirectory, 'owner.json'), 'utf8'), orphan);
    await rm(filename);
    await assert.rejects(runService(workspace, options), /recovery is locked.*Inspect/, 'An orphaned mutex also blocks an apparently fresh launch');
    await assert.rejects(readFile(filename), { code: 'ENOENT' });
    await rm(recoveryDirectory, { recursive: true });
    await writeFile(filename, stale);
    const controllers = [new AbortController(), new AbortController()];
    const failures = [];
    let confirm;
    const ready = new Promise(resolve => { confirm = resolve; });
    const launches = controllers.map(controller => runService(workspace, { ...options, signal: controller.signal, onReady: confirm }).catch(error => { failures.push(error); }));
    workspace.cleanups.push(async () => { controllers.forEach(controller => controller.abort()); await Promise.all(launches); });
    const record = await Promise.race([ready, Promise.all(launches).then(() => { throw new Error('Neither concurrent launch established ownership'); })]);
    await until(async () => failures.length, count => count === 1, 'The competing stale launch fails without replacing the new owner');
    const claimed = JSON.parse(await readFile(filename, 'utf8'));
    assert.equal(claimed.id, record.ownerId);
    assert.equal((await serviceCommand(workspace)).id, record.id);
    await assert.rejects(lstat(recoveryDirectory), { code: 'ENOENT' });
});

test('read-only control retries a recorded handover with fresh credentials while mutations never replay', async t => {
    const workspace = await fixture(t);
    const original = await supervise(t, workspace);
    await original.command('stop'); await original.completion;
    const previous = await readServiceRecord(workspace);
    const replacement = { ...previous, id: randomUUID(), token: randomUUID(), desired: 'running', status: 'ready' };
    const filename = path.join(workspace.statePath, 'process.json');
    let rotate = true;
    const received = [];
    const accepted = [];
    const socket = createSocket(client => {
        let text = '';
        client.on('data', chunk => {
            text += chunk;
            if (!text.includes('\n')) return;
            client.removeAllListeners('data');
            void (async () => {
                const command = JSON.parse(text.slice(0, text.indexOf('\n')));
                received.push(command);
                if (command.identity === replacement.id && command.token === replacement.token) { accepted.push(command.action); return { id: replacement.id, pid: replacement.pid, result: { id: replacement.id, status: 'ready' } }; }
                if (rotate) await writeFile(filename, JSON.stringify(replacement));
                return { id: replacement.id, pid: replacement.pid, error: 'Rejected prior process credentials.' };
            })().then(reply => client.end(`${JSON.stringify(reply)}\n`), error => client.destroy(error));
        });
    });
    await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(previous.endpoint, resolve); });
    workspace.cleanups.push(() => new Promise(resolve => socket.close(resolve)));
    await writeFile(filename, JSON.stringify(previous));
    assert.equal((await serviceCommand(workspace)).id, replacement.id);
    assert.deepEqual(received.map(command => command.token), [previous.token, replacement.token]);
    assert.deepEqual(accepted, ['inspect']);
    received.length = 0; accepted.length = 0;
    await writeFile(filename, JSON.stringify(previous));
    await assert.rejects(serviceCommand(workspace, 'resume'), /Process identity changed/);
    assert.equal(received.length, 1);
    assert.deepEqual(accepted, []);
    rotate = false; received.length = 0;
    await writeFile(filename, JSON.stringify(previous));
    await assert.rejects(serviceCommand(workspace), /Process identity changed/);
    assert.equal(received.length, 1, 'A mismatched endpoint without a recorded replacement is never retried');
});

test('detached startup publishes its identity before listening and waits for preparation before reporting success', async t => {
    const workspace = await fixture(t, 'TASK Future startup fixture\nTASK ID future\nTASK AFTER 2099-01-01T00:00Z\n');
    await mkdir(workspace.statePath, { recursive: true });
    const release = path.join(workspace.statePath, 'release-startup');
    const hook = path.join(workspace.gitRoot, '.git', 'hooks', 'pre-commit');
    await writeFile(hook, '#!/bin/sh\nprintf preparing > .ptbk/preparing-startup\nwhile [ ! -f .ptbk/release-startup ]; do sleep 0.05; done\n');
    await chmod(hook, 0o755);
    let resolved = false;
    const starting = startService(workspace, { mode: 'daemon', noPersist: true, noQr: true, noServer: true, automatic: true, inspectHarnesses: inventory }).then(value => { resolved = true; return value; });
    workspace.cleanups.push(async () => { await writeFile(release, 'release\n'); await starting.catch(() => {}); await stopService(workspace); });
    await until(async () => { try { return await readFile(path.join(workspace.statePath, 'preparing-startup'), 'utf8'); } catch { return ''; } }, value => value === 'preparing', 'Detached worker entered its guarded startup preparation');
    const record = await readServiceRecord(workspace);
    assert.equal(record.status, 'starting');
    assert.equal((await serviceCommand(workspace)).id, record.id);
    assert.equal((await serviceCommand(workspace)).status, 'starting');
    await delay(400);
    assert.equal(resolved, false, 'A reachable starting process has not yet confirmed successful initialization');
    await writeFile(release, 'release\n');
    const ready = await starting;
    assert.equal(ready.id, record.id);
    assert.notEqual(ready.status, 'starting');
    await stopService(workspace);
});

test('process birth remains stable when the caller changes locale and timezone', async () => {
    for (const pid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1; unsafe-command']) assert.equal(await processBirth(pid), undefined);
    const locale = process.env.LC_ALL;
    const timezone = process.env.TZ;
    const birth = await processBirth(process.pid);
    assert.ok(birth);
    try {
        process.env.LC_ALL = 'fr_FR.UTF-8';
        process.env.TZ = 'Pacific/Honolulu';
        assert.equal(await processBirth(process.pid), birth);
    } finally {
        if (locale === undefined) delete process.env.LC_ALL; else process.env.LC_ALL = locale;
        if (timezone === undefined) delete process.env.TZ; else process.env.TZ = timezone;
    }
});
