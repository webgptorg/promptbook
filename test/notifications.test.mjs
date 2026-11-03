import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { pingsUser, withoutUserPing, withUserPing } from '../dist/book/references.js';
import { ChatStore } from '../dist/chats/store.js';
import { domainAttention } from '../dist/engine/attention.js';
import { WalletSubEngine } from '../dist/wallet/wallet.js';
import { git, initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * A chat store over a bare temporary project (no Git, no service).
 */
async function storeAt(t) {
    const root = await temporaryDirectory(t, 'ptbk attention');
    const project = { root, runtime: { root: join(root, '.ptbk'), state: join(root, '.ptbk', 'state') } };
    return { root, project, store: new ChatStore(project, { timeZone: 'UTC' }) };
}

/**
 * The summary of one chat.
 */
async function summaryOf(store, name) {
    return (await store.summaries()).find((summary) => summary.name === name);
}

/**
 * A Wallet over a temporary project with the explicit fixture unlock store under `home`.
 */
function walletAt(root, home) {
    let changes = 0;
    let settled = 0;
    const project = { root, runtime: { root: join(root, '.ptbk') } };
    const wallet = new WalletSubEngine({ project, env: { ...process.env, PTBK_HOME: home, PTBK_HOST_UNLOCK: 'insecure-test-file' }, onChange: () => changes++, onSettled: () => settled++, log: () => undefined });
    return { wallet, counts: () => ({ changes, settled }) };
}

/**
 * A login page double on one origin (nothing is ever entered: the Wallet has no saved login).
 */
function loginPage(origin) {
    const entered = [];
    return { entered, page: { browser: 'test-browser', inspect: async () => ({ origin, form: 'password' }), signIn: async (credentials) => (entered.push(credentials), { result: 'signed-in' }) } };
}

test('User pings: only the active +@User / +{User} prefix pings; mentions, code, quotes, escapes and examples stay passive', () => {
    assert.equal(pingsUser('+@User which colour should I use?'), true);
    assert.equal(pingsUser('Please decide, +{User}.'), true);
    assert.equal(pingsUser('+{ user } any preference?'), true, 'case and spacing of the braced name do not matter');
    assert.equal(pingsUser('@User wrote this earlier.'), false, 'a plain mention is passive');
    assert.equal(pingsUser('Write `+@User` to ask the human.'), false, 'inline code is never an action');
    assert.equal(pingsUser('```\n+@User\n```'), false, 'fenced code is never an action');
    assert.equal(pingsUser('> +@User quoted from the earlier chat'), false, 'a quoted passage is never an action');
    assert.equal(pingsUser('The agent said "+@User approve" yesterday.'), false);
    assert.equal(pingsUser('Escaped \\+@User stays text.'), false);
    assert.equal(pingsUser('The syntax, for example: +@User'), false, 'an illustrative example is no ping');
    assert.equal(pingsUser('+@Developer please check'), false, 'another agent is not the human');

    assert.equal(withUserPing('Which colour?'), '+@User Which colour?');
    assert.equal(withUserPing('1. Red\n2. Blue'), '+@User\n1. Red\n2. Blue', 'Markdown structure stays on its own lines');
    assert.equal(withUserPing('+@User Which colour?'), '+@User Which colour?', 'an existing ping is kept once');
    assert.equal(withoutUserPing(withUserPing('Which colour?')), 'Which colour?');
    assert.equal(withoutUserPing(withUserPing('1. Red\n2. Blue')), '1. Red\n2. Blue');
});

test('chat attention: an explicit ping invites the human once, seen is shared and durable, and only a response resolves it', async (t) => {
    const { project, store } = await storeAt(t);
    // An agent-only report thread: the ping invites the human before its message.
    const created = await store.create({ name: 'Weekly report', members: ['@Developer', '@Writer'], status: 'open', messages: [{ sender: '@Developer', text: 'Draft is ready.' }] });
    const name = created.chat.name;
    assert.equal((await summaryOf(store, name)).pings, undefined, 'no ping, no attention');
    let written = await store.append(name, { sender: '@Developer', text: '+@User should the report include the budget?' }, { status: 'waiting-for-user' });
    assert.ok(written.chat.members.includes('@User'), 'the explicit ping invites the human');
    assert.equal(written.chat.members.filter((member) => member === '@User').length, 1);
    let summary = await summaryOf(store, name);
    assert.deepEqual(summary.pings.map((ping) => [ping.message, ping.sender]), [[2, '@Developer']]);
    assert.match(summary.pings[0].text, /include the budget/);

    // A passive mention and streamed progress are no new occurrences.
    await store.append(name, { sender: '@Writer', text: 'I agree with @User on the tone.' });
    await store.append(name, { sender: '@Writer', text: '+@User progress only', phase: 'progress' });
    assert.equal((await summaryOf(store, name)).pings.length, 1);

    // Displaying the message to an active viewer: seen everywhere, the question keeps waiting.
    assert.equal(await store.markSeen(name, [3, 99]), 0, 'a position without an outstanding occurrence creates nothing');
    assert.equal(await store.markSeen(name, [2]), 1);
    assert.equal(await store.markSeen(name, [2]), 0, 'seeing it again changes nothing');
    summary = await summaryOf(store, name);
    assert.equal(summary.pings, undefined, 'a seen ping is no longer attention');
    assert.equal(summary.status, 'waiting-for-user', 'seen is not an answer: the question still waits');

    // Another client (a restarted engine, a standalone chat) reads the same durable state.
    const other = new ChatStore(project, { timeZone: 'UTC' });
    assert.equal((await summaryOf(other, name)).pings, undefined);
    const stored = JSON.parse(await readFile(join(project.runtime.state, 'attention.json'), 'utf8'));
    assert.equal(stored.pings.length, 1);
    assert.ok(stored.pings[0].seenAt && !stored.pings[0].resolvedAt);

    // A new ping in the same chat is a new occurrence; the chat no longer waiting resolves it.
    written = await other.append(name, { sender: '@Writer', text: '+{User} one more thing: which date?' }, { status: 'waiting-for-user' });
    assert.equal(written.chat.members.filter((member) => member === '@User').length, 1, 'an existing member is only pinged');
    assert.deepEqual((await summaryOf(store, name)).pings.map((ping) => ping.message), [5]);
    await store.setStatus(name, 'open');
    assert.equal((await summaryOf(store, name)).pings, undefined);
    const settled = JSON.parse(await readFile(join(project.runtime.state, 'attention.json'), 'utf8')).pings.find((ping) => ping.message === 5);
    assert.ok(settled.resolvedAt && !settled.seenAt, 'resolved without having been seen');
});

test('chat attention: a waiting question written before pings existed is one implicit occurrence until it is seen', async (t) => {
    const { root, store } = await storeAt(t);
    await mkdir(join(root, 'chats'), { recursive: true });
    await writeFile(join(root, 'chats', 'legacy.book'), 'CHAT Legacy question\nCHAT MEMBER @User\nCHAT MEMBER @Developer\nCHAT STATUS waiting-for-user\n\nCHAT MESSAGE @Developer 2026-10-01T10:00:00+00:00\nWhich branch should I use?\n');
    const summary = await summaryOf(store, 'Legacy question');
    assert.deepEqual(summary.pings.map((ping) => ping.message), [1]);
    assert.equal(await store.markSeen('Legacy question', [1]), 1);
    assert.equal((await summaryOf(store, 'Legacy question')).pings, undefined, 'seen once, it stays seen');
    assert.equal((await summaryOf(store, 'Legacy question')).status, 'waiting-for-user');
});

test('dashboard attention: seen chat pings and seen Wallet requests leave the question waiting without attention; tasks follow their request', () => {
    const base = { blockers: [], queue: [], chats: { waiting: [], unread: 0, total: 0, recent: [], pings: [] } };
    const ping = { id: 'weeklyreport#2', chat: 'Weekly report', title: 'Weekly report', message: 2, sender: '@Developer', at: '2026-11-03T10:00:00Z', text: '+@User budget?', links: [] };
    const waitingTask = { ref: 'tasks/a.book', title: 'Weekly update', readiness: 'awaiting-user', waitingChat: 'Weekly report' };
    const walletTask = { ref: 'tasks/b.book', title: 'Post update', readiness: 'awaiting-user', waitingWallet: true };
    const request = { id: 'r1', origin: 'https://example.com', problem: 'missing', reason: 'post', tasks: ['Post update'], browser: 'b', createdAt: '2026-11-03T10:00:00Z', requests: 1 };
    const wallet = { state: 'ready', pending: [request], records: [] };

    let attention = domainAttention({ ...base, chats: { ...base.chats, pings: [ping] }, queue: [waitingTask, walletTask], wallet });
    assert.equal(attention.chats.key, 'weeklyreport#2');
    assert.equal(attention.wallet.key, 'request:r1:missing:0');
    assert.equal(attention.tasks.key, 'tasks/a.book:awaiting-user|tasks/b.book:awaiting-user');

    attention = domainAttention({ ...base, queue: [waitingTask, walletTask], wallet: { ...wallet, pending: [{ ...request, seenAt: '2026-11-03T10:05:00Z' }] } });
    assert.equal(attention.chats, undefined, 'a seen ping is no attention');
    assert.equal(attention.wallet, undefined, 'a seen Wallet request keeps waiting without attention');
    assert.equal(attention.tasks, undefined, 'the tasks waiting for them are the same occurrences');

    attention = domainAttention({ ...base, wallet: { ...wallet, pending: [{ ...request, seenAt: '2026-11-03T10:05:00Z', step: 1 }] } });
    assert.equal(attention.wallet, undefined);
    attention = domainAttention({ ...base, wallet: { ...wallet, pending: [{ ...request, step: 1 }] } });
    assert.equal(attention.wallet.key, 'request:r1:missing:1', 'a new step is a new attention key');

    // A task question without a known request stays attention, and so does an older engine without seen state.
    assert.ok(domainAttention({ ...base, queue: [{ ref: 'tasks/c.book', title: 'Other', readiness: 'awaiting-user' }] }).tasks);
    const older = { ...base, chats: { waiting: [{ name: 'Weekly report', messages: 2 }], unread: 0, total: 1, recent: [] } };
    assert.equal(domainAttention(older).chats.key, 'Weekly report:2');
});

test('Wallet: Mark as seen keeps the request waiting, Reject request ends it truthfully, and a stale step changes nothing', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk wallet attention');
    const home = join(root, 'computer');
    const project = join(root, 'project');
    await mkdir(project, { recursive: true });
    const first = walletAt(project, home);
    await first.wallet.initialize();
    const page = loginPage('https://example.com');
    const waiting = await first.wallet.login(page.page, { reason: 'post the weekly update', task: 'Weekly update' });
    assert.equal(waiting.status, 'waiting');
    let [request] = first.wallet.view().pending;
    assert.equal(request.seenAt, undefined);

    assert.equal((await first.wallet.markSeen(request.id, 3)).applied, false, 'a stale step is not acknowledged');
    const changes = first.counts().changes;
    const seen = await first.wallet.markSeen(request.id, request.step ?? 0);
    assert.equal(seen.applied, true, seen.outcome);
    assert.match(seen.outcome, /keeps waiting/);
    assert.equal(first.counts().changes, changes + 1, 'every client is told at once');
    assert.equal(first.counts().settled, 0, 'seen never settles the request');
    [request] = first.wallet.view().pending;
    assert.ok(request.seenAt, 'still pending, now seen');
    assert.equal((await first.wallet.markSeen(request.id)).applied, false, 'already seen');

    // The same step asked again (a retry) keeps its seen state; a restarted engine reads it from disk.
    await first.wallet.login(page.page, { reason: 'post the weekly update', task: 'Weekly update' });
    assert.ok(first.wallet.view().pending[0].seenAt);
    const second = walletAt(project, home);
    await second.wallet.initialize();
    assert.ok(second.wallet.view().pending[0].seenAt, 'seen survives a restart');

    // Reject request: denial for the waiting work, never a sign-in; its retry gets the rejection, not a new alert.
    const rejected = await second.wallet.reject(request.id, request.step ?? 0);
    assert.equal(rejected.applied, true, rejected.outcome);
    assert.match(rejected.outcome, /nothing was provided/);
    assert.equal(second.counts().settled, 1);
    assert.deepEqual(second.wallet.view().pending, []);
    const retried = await second.wallet.login(page.page, { reason: 'post the weekly update', task: 'Weekly update' });
    assert.equal(retried.status, 'rejected');
    assert.deepEqual(second.wallet.view().pending, [], 'the rejected request is not recreated or alerted again');
    assert.equal(page.entered.length, 0);
    assert.equal((await second.wallet.reject(request.id)).applied, false, 'a concurrent second rejection changes nothing');

    // Other work may still ask for the same login.
    const other = await second.wallet.login(page.page, { reason: 'monthly report', task: 'Monthly report' });
    assert.equal(other.status, 'waiting');
    assert.equal(second.wallet.view().pending.length, 1);
    assert.equal((await second.wallet.login(page.page, { reason: 'post the weekly update', task: 'Weekly update' })).status, 'rejected', 'other work cannot reopen the denied request');
    assert.deepEqual(second.wallet.view().pending[0].tasks, ['Monthly report']);
});

test('chat attention: acknowledging another request never expires an old seen unanswered question', async (t) => {
    const { project, store } = await storeAt(t);
    const first = await store.create({ name: 'First question', members: ['@Developer', '@User'], status: 'waiting-for-user', messages: [{ sender: '@Developer', text: '+@User which date?' }] });
    await store.markSeen(first.chat.name, [1]);
    const file = join(project.runtime.state, 'attention.json');
    const saved = JSON.parse(await readFile(file, 'utf8'));
    saved.pings[0].seenAt = '2000-01-01T00:00:00Z';
    await writeFile(file, JSON.stringify(saved));
    await store.create({ name: 'Second question', members: ['@Developer', '@User'], status: 'waiting-for-user', messages: [{ sender: '@Developer', text: '+@User which colour?' }] });
    assert.equal((await summaryOf(store, first.chat.name)).pings, undefined, 'an unanswered but seen question remains seen indefinitely');
    assert.equal((await summaryOf(store, first.chat.name)).status, 'waiting-for-user');
});

test('service attention: displaying a pinged message marks it seen for every client and restart, without answering it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await mkdir(join(project, 'chats'), { recursive: true });
    await writeFile(join(project, 'chats', 'question.book'), 'CHAT Branch question\nCHAT MEMBER @User\nCHAT MEMBER @Developer\nCHAT STATUS waiting-for-user\n\nCHAT MESSAGE @Developer 2026-11-03T10:00:00+00:00\n+@User which branch should I use?\n');
    await git(project, ['add', 'chats']);
    await git(project, ['commit', '-qm', 'A waiting question']);
    const status = async () => JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const before = await waitFor(async () => {
        const snapshot = await status();
        return snapshot.attention?.chats ? snapshot : undefined;
    }, { timeoutMs: 60_000, message: 'chat attention for the waiting question' });
    assert.deepEqual(before.chats.pings.map((ping) => [ping.chat, ping.message]), [['Branch question', 1]]);

    const { token } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const call = async (path, body) => {
        const response = await fetch(`${before.connection.local.url}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return { status: response.status, data: await response.json() };
    };
    const seen = await call(`api/chats/${encodeURIComponent('Branch question')}/seen`, { messages: [1] });
    assert.equal(seen.status, 200, JSON.stringify(seen.data));
    const after = await waitFor(async () => {
        const snapshot = await status();
        return snapshot.attention?.chats ? undefined : snapshot;
    }, { timeoutMs: 30_000, message: 'chat attention to clear' });
    assert.deepEqual(after.chats.pings, []);
    assert.ok(after.chats.waiting.some((chat) => chat.name === 'Branch question'), 'the question keeps waiting');

    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const restarted = await waitFor(async () => {
        const snapshot = await status();
        return snapshot.chats?.waiting?.length ? snapshot : undefined;
    }, { timeoutMs: 60_000, message: 'the restarted service snapshot' });
    assert.equal(restarted.attention?.chats, undefined, 'seen survives a restart');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
