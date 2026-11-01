import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { HarnessSessions, LEASE_TTL_MS } from '../dist/harness/sessions.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { initializedProject, ptbk, waitFor } from './helpers.mjs';

/** A plugin as far as the inventory cares. */
const plugin = { id: 'openai-codex', displayName: 'OpenAI Codex' };

/** A session descriptor of a chat. */
const chatSession = (change = {}) => ({ key: 'chat:Plan:Chatter', agent: 'Chatter', work: { kind: 'chat', chat: 'Plan' }, tool: 'codex', plugin, authentication: 'account', ...change });

/** An inventory that keeps what it would have saved. */
function inventory() {
    const saved = [];
    return { saved, sessions: new HarnessSessions({ save: async (records) => void saved.push(records) }) };
}

/** Status snapshot of a project as JSON. */
async function status(project, env) {
    return JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
}

/** Sends one control request to the project's engine. */
async function control(project, method, params = {}) {
    const record = await readProcessRecord(projectAt(project));
    return await new ControlClient(projectAt(project), record).request(method, params, 60_000);
}

test('a session is distinct from its turns: a finished turn leaves it idle, and a helper session ends with its turn', () => {
    const { sessions } = inventory();
    const opened = sessions.open(chatSession());
    assert.equal(opened.state, 'opening');
    sessions.turnStarted(opened.key);
    sessions.observe(opened.key, { type: 'session', id: 'thread-1' });
    sessions.observe(opened.key, { type: 'reasoning', text: 'hidden thoughts' });
    sessions.observe(opened.key, { type: 'message', text: 'Hello' });
    assert.equal(sessions.byKey(opened.key).state, 'working');
    sessions.turnEnded(opened.key, { outcome: 'completed', diagnostic: '' });
    const idle = sessions.byKey(opened.key);
    assert.equal(idle.state, 'idle', 'a completed turn does not end its session');
    assert.equal(idle.handle, opened.handle, 'the same logical session');
    assert.deepEqual(idle.output, ['Hello'], 'hidden reasoning is never captured');
    assert.equal(idle.usage, undefined, 'unknown usage is not zero');
    assert.deepEqual(sessions.view().counts, { open: 1, working: 0, idle: 1, waiting: 0, attention: 0 });

    sessions.open({ key: 'consultation:1', agent: 'Lawyer', work: { kind: 'helper', purpose: 'Consultation' }, plugin, authentication: 'unknown', ephemeral: true });
    sessions.turnStarted('consultation:1');
    sessions.turnEnded('consultation:1', { outcome: 'completed', diagnostic: '' });
    assert.equal(sessions.byKey('consultation:1'), undefined);
    assert.equal(sessions.view().ended[0].agent, 'Lawyer', 'ended evidence is retained, never shown as open');
});

test('another named tool is a real replacement with its predecessor, never a silent account change', () => {
    const { sessions } = inventory();
    const first = sessions.open(chatSession());
    sessions.capabilities(first.key, { continueInput: true, liveSteering: false, interrupt: true, nativeClient: true, nativeWatch: false, sharedControl: false, notes: [] });
    sessions.observe(first.key, { type: 'session', id: 'thread-1' });
    assert.equal(sessions.continuable(first.key, 'codex'), 'thread-1');
    assert.equal(sessions.continuable(first.key, 'codex-2'), undefined, 'another tool cannot continue this provider session');
    const second = sessions.open(chatSession({ tool: 'codex-2' }));
    assert.notEqual(second.handle, first.handle);
    assert.equal(second.predecessor.handle, first.handle);
    assert.match(second.predecessor.reason, /codex-2/);
    assert.equal(sessions.view().ended[0].handle, first.handle);
});

test('a restored session is retained context: an interrupted turn stays uncertain and a lease without a live client lapses', () => {
    const { sessions } = inventory();
    const at = new Date().toISOString();
    const record = { handle: 'hs-1', key: 'task:run', providerIds: ['thread-1'], agent: 'Developer', work: { kind: 'task', task: 'Write', ref: 'Write', source: 'tasks/w.book', run: 'run', workKind: 'task' }, tool: 'codex', harness: 'openai-codex', harnessName: 'OpenAI Codex', authentication: 'account', state: 'working', turns: 1, observedAt: at, openedAt: at, output: [] };
    sessions.restore([{ ...record, lease: { mode: 'exclusive', holder: 'gone', clientPid: 2 ** 22 + 12345, acquiredAt: at, expiresAt: at } }]);
    const restored = sessions.byKey('task:run');
    assert.equal(restored.state, 'interrupted');
    assert.match(restored.detail, /uncertain/);
    assert.equal(restored.lease, undefined);
    assert.equal(sessions.automaticInputAllowed('task:run'), true);
});

test('exclusive control gates automatic input of one session only, cannot be stolen and lapses when its client is gone', async () => {
    const { sessions } = inventory();
    const opened = sessions.open(chatSession());
    sessions.open(chatSession({ key: 'chat:Other:Chatter', work: { kind: 'chat', chat: 'Other' } }));
    sessions.turnStarted(opened.key);
    assert.match(sessions.acquireLease(opened.handle, { holder: 'one', mode: 'exclusive' }).reason, /running/, 'a running turn cannot be joined');
    sessions.turnEnded(opened.key, { outcome: 'completed', diagnostic: '' });
    assert.equal(sessions.acquireLease(opened.handle, { holder: 'one', mode: 'exclusive' }).ok, true);
    assert.equal(sessions.acquireLease(opened.handle, { holder: 'two', mode: 'exclusive' }).ok, false, 'a second controller cannot take it');
    assert.match(sessions.acquireLease(opened.handle, { holder: 'two', mode: 'shared' }).reason, /Another client/);
    assert.equal(sessions.automaticInputAllowed(opened.key), false);
    assert.equal(sessions.automaticInputAllowed('chat:Other:Chatter'), true, 'other sessions continue');

    const controller = new AbortController();
    let delivered = false;
    const waiting = sessions.untilAutomaticInput(opened.key, 'Reply in {Plan}', controller.signal).then(() => (delivered = true));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(delivered, false);
    assert.deepEqual(sessions.byKey(opened.key).heldInputs, ['Reply in {Plan}'], 'what is held back stays visible');
    assert.equal(sessions.renewLease(opened.handle, 'two'), false, 'a stranger cannot renew');
    assert.equal(sessions.releaseLease(opened.handle, 'two'), false, 'a stranger cannot release');
    sessions.reconcile(Date.now() + LEASE_TTL_MS + 1);
    await waiting;
    assert.equal(delivered, true, 'the lapsed lease releases the input');
    assert.equal(sessions.byKey(opened.key).lease, undefined);
    assert.deepEqual(sessions.byKey(opened.key).heldInputs, []);
    assert.equal(sessions.renewLease(opened.handle, 'one'), false, 'a stale client learns that it lost control');

    assert.equal(sessions.acquireLease(opened.handle, { holder: 'two', mode: 'exclusive' }).ok, true);
    assert.equal(sessions.releaseLease(opened.handle, 'two', 'closed'), true);
    assert.equal(sessions.acquireLease(opened.handle, { holder: 'three', mode: 'shared' }).ok, false, 'shared control needs an integration that can order inputs');
});

test('continuing a provider session keeps the options of each adapter', async () => {
    const request = { projectRoot: '/tmp', cwd: '/tmp', prompt: 'Go', promptFile: '/tmp/p.md', readOnly: false, env: { PATH: '' }, allowCredits: false, authentication: 'account', readableDirectories: [], resumeSessionId: 'thread-9', model: 'm' };
    const codex = await harnessPlugin('openai-codex').buildInvocation(request);
    assert.deepEqual(codex.args.slice(0, 3), ['exec', 'resume', '--json']);
    assert.deepEqual(codex.args.slice(-2), ['thread-9', '-']);
    assert.ok(codex.args.includes('sandbox_mode="workspace-write"'), 'the sandbox is kept through configuration');
    assert.ok(!codex.args.includes('--sandbox'), 'exec resume has no --sandbox of its own');
    const claude = await harnessPlugin('claude-code').buildInvocation(request);
    assert.deepEqual(claude.args.slice(claude.args.indexOf('--resume'), claude.args.indexOf('--resume') + 2), ['--resume', 'thread-9']);
    const fresh = await harnessPlugin('openai-codex').buildInvocation({ ...request, resumeSessionId: undefined });
    assert.deepEqual(fresh.args.slice(0, 2), ['exec', '--json']);
    assert.equal(harnessPlugin('openai-codex').sessions.nativeClientArgs('thread-9').join(' '), 'resume thread-9');
    assert.equal(harnessPlugin('claude-code').sessions.nativeClientArgs('thread-9').join(' '), '--resume thread-9');
    assert.equal(harnessPlugin('github-copilot').sessions.nativeClientArgs, undefined, 'no client is promised without a verified integration');
});

test('engine: chats keep idle sessions, tasks use their own, entry is deliberate and a lease holds only that session', { timeout: 240_000 }, async (t) => {
    const { project, env } = await initializedProject(t);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['chat', 'Hello, how are you?', '--raw'], { cwd: project, env })).code, 0);
    const chatting = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'chat' && session.state === 'idle'), { message: 'an idle chat session' });
    assert.equal(chatting.agent, 'Chatter');
    assert.ok(chatting.tool, 'the named tool is kept');
    assert.equal(chatting.capabilities.continueInput, true, 'observed from the installed release');
    assert.equal(chatting.capabilities.liveSteering, false, 'streaming output does not establish steering');
    assert.ok(chatting.providerIds.length, 'the provider-native identifier is kept');
    assert.match(chatting.nativeReturn, /closes only the client/);

    const offer = (await control(project, 'session-entry', { handle: chatting.handle })).data;
    assert.equal(offer.available, true, JSON.stringify(offer));
    assert.equal(offer.watch.native, false, 'a client that cannot be read-only is not offered as watch');
    assert.equal(offer.shared.available, false);
    assert.equal(offer.exclusive.available, true);
    assert.equal((await status(project, env)).harnessSessions.open.find((session) => session.handle === chatting.handle).lease, undefined, 'asking what can be offered changes nothing');

    const taken = await control(project, 'session-acquire', { handle: chatting.handle, holder: 'terminal test', mode: 'exclusive' });
    assert.equal(taken.applied, true, taken.outcome);
    assert.equal(taken.data.args.join(' '), `resume ${chatting.providerIds.at(-1)}`, 'the actual client of this very session');
    assert.deepEqual(taken.data.env, {}, 'no credential is handed to a client');
    const second = await control(project, 'session-acquire', { handle: chatting.handle, holder: 'another client', mode: 'exclusive' });
    assert.equal(second.applied, false, 'a second controller cannot take it');
    assert.match(second.outcome, /Another client/);

    // Automatic input to this session waits; other work continues.
    const chatName = chatting.work.chat;
    await ptbk(['add', 'Independent work', '--agent', 'Developer', '--raw'], { cwd: project, env });
    await control(project, 'chat-send', { name: chatName, text: 'And another thing?', via: 'test' });
    const holding = await waitFor(async () => (await status(project, env)).harnessSessions.open.find((session) => session.handle === chatting.handle && session.heldInputs?.length), { message: 'the reply to wait visibly' });
    assert.equal(holding.turns, chatting.turns, 'no turn starts while a person holds this session');
    const task = await waitFor(async () => (await status(project, env)).harnessSessions.ended.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Independent work')), { message: 'other work to finish meanwhile', timeoutMs: 90_000 });
    assert.equal(task.agent, 'Developer');
    assert.notEqual(task.handle, chatting.handle, 'a task has its own session');
    assert.equal((await status(project, env)).harnessSessions.open.find((session) => session.handle === chatting.handle).lease.holder, 'terminal test');

    const released = await control(project, 'session-release', { handle: chatting.handle, holder: 'terminal test', detail: 'The native client closed; this session stays open.' });
    assert.equal(released.applied, true);
    assert.equal((await control(project, 'session-renew', { handle: chatting.handle, holder: 'terminal test' })).applied, false, 'a stale client cannot write any more');
    await waitFor(async () => (await status(project, env)).harnessSessions.open.find((session) => session.handle === chatting.handle && session.turns > chatting.turns), { message: 'the held reply after control returned' });
    await ptbk(['stop', '--raw'], { cwd: project, env });

    // Identity survives a restart: it is retained context, with no turn repeated.
    const stored = JSON.parse(await readFile(join(project, '.ptbk', 'state', 'harness-sessions.json'), 'utf8').catch(async () => '[]'));
    assert.ok(stored.some((session) => session.handle === chatting.handle), 'the inventory is persisted');
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const restored = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.handle === chatting.handle), { message: 'the restored session' });
    assert.deepEqual(restored.providerIds.slice(0, chatting.providerIds.length), chatting.providerIds);
    await ptbk(['stop', '--raw'], { cwd: project, env });
});

test('engine: interrupted work continues in its own provider session after resume', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '4000' };
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const working = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Slow work') && session.providerIds.length), { message: 'the task session' });
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    const paused = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.service.state === 'pause' ? snapshot : undefined;
    }, { message: 'the pause' });
    const interrupted = paused.harnessSessions.open.find((session) => session.handle === working.handle);
    assert.equal(interrupted.state, 'interrupted', 'an interrupted session stays open with its checkpoint');
    assert.equal((await control(project, 'session-entry', { handle: working.handle })).data.available, false, 'control of a task session would advance paused work');
    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    const continued = await waitFor(async () => {
        const lines = (await readFile(log, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
        return lines.find((entry) => entry.title?.startsWith('Slow work') && entry.resumedThread);
    }, { message: 'the continued turn' });
    assert.equal(continued.resumedThread, working.providerIds.at(-1), 'the same provider session, not a second executor');
    await ptbk(['stop', '--force', '--raw'], { cwd: project, env });
});
