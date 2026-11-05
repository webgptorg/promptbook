import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { pingsUser } from '../dist/book/references.js';
import { ChatStore } from '../dist/chats/store.js';
import { AttentionOwner } from '../dist/engine/attention-owner.js';
import { domainAttention } from '../dist/engine/attention.js';
import { USER_PING_INSTRUCTION } from '../dist/engine/prompt.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory } from './helpers.mjs';

/**
 * A chat store in a temporary project (no commits) with one human-facing chat whose agent asked two questions.
 */
async function twoQuestions(t) {
    const project = projectAt(await temporaryDirectory(t, 'ptbk attention'));
    const store = new ChatStore(project, { timeZone: 'UTC' });
    const created = await store.create({ name: 'Invoices', members: ['@User', '@Accountant'], status: 'waiting-for-user', messages: [{ sender: '@Accountant', text: '+@User Please upload the October invoice A.' }] });
    await store.append(created.chat.name, { sender: '@Accountant', text: '+@User And please confirm the bank account B.' }, { status: 'waiting-for-user' });
    return { project, store, name: created.chat.name };
}

/**
 * Waits until a condition holds (bounded).
 */
async function until(condition, label) {
    for (let index = 0; index < 200; index++) {
        if (await condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out: ${label}`);
}

test('withdrawing one of two requests retires only its wait, keeps history and appends one passive explanation', async (t) => {
    const { store, name } = await twoQuestions(t);
    assert.deepEqual((await store.outstandingRequests()).map((request) => [request.message, request.owner]), [[1, 'Accountant'], [2, 'Accountant']]);
    await store.markSeen(name, [1]);
    const first = await store.withdrawRequests(name, { messages: [1], by: 'Accountant', reason: 'Invoice A is now in invoices/2026-10.pdf, so I no longer need it; +@User nothing to do.' });
    assert.deepEqual(first.withdrawn, [1]);
    assert.equal(first.remaining, 1);
    assert.equal(first.chat.status, 'waiting-for-user', 'B still waits');
    assert.equal(first.chat.messages.length, 3);
    const explanation = first.chat.messages[2];
    assert.equal(explanation.sender, '@Accountant');
    assert.equal(pingsUser(explanation.text), false, 'cleanup never pings the human again');
    assert.match(explanation.text, /Invoice A is now in invoices/);
    assert.equal(first.chat.messages[0].text, '+@User Please upload the October invoice A.', 'the original ping stays in history');
    const pings = await store.attention.list();
    const withdrawn = pings.find((ping) => ping.message === 1);
    assert.equal(withdrawn.withdrawn.by, 'Accountant');
    assert.equal(withdrawn.withdrawn.message, 3);
    assert.ok(withdrawn.seenAt, 'seen history is preserved');
    assert.deepEqual((await store.summaries())[0].pings.map((ping) => ping.message), [2], 'only B still asks for attention');
    // Racing checks, retries and restarts withdraw once.
    const again = await store.withdrawRequests(name, { messages: [1], by: 'Accountant', reason: 'Invoice A is now in invoices/2026-10.pdf, so I no longer need it.' });
    assert.deepEqual(again.withdrawn, []);
    assert.equal((await store.find(name)).chat.messages.length, 3, 'no duplicate explanation');
    // The last dependency clears: the chat's ordinary status transition follows.
    const last = await store.withdrawRequests(name, { by: 'Accountant', reason: 'You confirmed account B in the other chat, so I no longer need it.' });
    assert.deepEqual(last.withdrawn, [2]);
    assert.equal(last.chat.status, 'open');
    assert.deepEqual(await store.outstandingRequests(), []);
});

test('a withdrawal interrupted before its explanation is completed once and never reopens the wait', async (t) => {
    const { store, name } = await twoQuestions(t);
    const stored = await store.find(name);
    // The wait is retired but the process ends before the message is saved.
    await store.attention.withdraw({ key: stored.chat.key, messages: [2], by: 'Fixer', reason: 'Account B was confirmed already.' });
    assert.deepEqual((await store.outstandingRequests()).map((request) => request.message), [1]);
    assert.equal(await store.reconcileWithdrawals(), 1);
    assert.equal(await store.reconcileWithdrawals(), 0, 'completed once');
    const chat = (await store.find(name)).chat;
    assert.equal(chat.messages.at(-1).sender, '@Fixer', 'a new responsible speaker joins before speaking');
    assert.ok(chat.members.includes('@Fixer'));
    assert.equal(chat.messages.filter((message) => message.text === 'Account B was confirmed already.').length, 1);
    assert.equal(chat.status, 'waiting-for-user', 'A still waits');
});

test('relevance supervision: progressive owner checks, Pause, deterministic withdrawal, unchanged evidence and orphan transfer', async (t) => {
    const { project, store, name } = await twoQuestions(t);
    let allowed = false;
    let evidence = 'e1';
    const assessed = [];
    const withdrawnChats = [];
    let verdict = 'needed';
    let obsoleteReason;
    let exists = true;
    const host = {
        chats: store,
        stateDirectory: project.runtime.state,
        agentsAllowed: () => allowed,
        agentExists: () => exists,
        obsolete: async () => obsoleteReason,
        evidence: async () => evidence,
        assess: async (owner, requests) => {
            assessed.push({ owner, ids: requests.map((request) => request.message) });
            if (verdict === 'unavailable') return { unavailable: 'No usable harness for Accountant.' };
            return { verdicts: requests.map((request) => (request.message === 1 && verdict === 'resolved' ? { id: request.id, needed: false, reason: 'Invoice A arrived by email, so I no longer need it.' } : { id: request.id, needed: true, reason: 'Still missing.' })) };
        },
        onWithdrawn: async (chat) => void withdrawnChats.push(chat),
        onChange: () => undefined,
        log: () => undefined,
        policy: { initialMs: 1, maxMs: 7 * 24 * 3_600_000, multiplier: 2, jitter: 0 },
    };
    const owner = new AttentionOwner(host);
    t.after(() => owner.stop());
    await owner.reconcile();
    const [first, second] = (await store.outstandingRequests()).map((request) => request.id);
    assert.equal(owner.view(first).owner, 'Accountant');
    // Pause: due checks wait, nothing is assessed.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await owner.reconcile();
    assert.equal(owner.view(first).state, 'paused');
    assert.equal(assessed.length, 0, 'no automatic agent check while paused');
    // Resume without new evidence since asking: the due check backs off without paid inference.
    allowed = true;
    await owner.reconcile();
    assert.deepEqual(assessed, [], 'the evidence at asking time is the baseline');
    assert.equal(owner.view(first).lastOutcome, 'No new evidence; still waiting.');
    // Relevant evidence: one coalesced assessment of the owner's related requests at the next due round.
    evidence = 'e1b';
    await new Promise((resolve) => setTimeout(resolve, 10));
    await owner.reconcile();
    assert.deepEqual(assessed, [{ owner: 'Accountant', ids: [1, 2] }]);
    assert.equal(owner.view(first).lastOutcome, 'Still needed: Still missing.');
    const firstGap = Date.parse(owner.view(first).nextAt) - Date.parse(owner.view(first).lastCheckAt);
    // Unchanged evidence: the next due round backs off without paid inference.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await owner.reconcile();
    assert.equal(assessed.length, 1, 'no idle inference on unchanged evidence');
    assert.equal(owner.view(first).lastOutcome, 'No new evidence; still waiting.');
    assert.ok(Date.parse(owner.view(first).nextAt) - Date.parse(owner.view(first).lastCheckAt) > firstGap, 'intervals grow');
    // New evidence: the owner decides A is no longer needed; B keeps waiting without another ping.
    evidence = 'e2';
    verdict = 'resolved';
    await new Promise((resolve) => setTimeout(resolve, 40));
    await owner.reconcile();
    assert.equal(assessed.length, 2);
    assert.deepEqual(withdrawnChats, [name]);
    assert.deepEqual((await store.outstandingRequests()).map((request) => request.message), [2]);
    assert.equal(owner.view(first), undefined, 'the retired condition has no schedule');
    assert.match((await store.find(name)).chat.messages.at(-1).text, /arrived by email/);
    // No usable harness: an honest pending check, not a fabricated one.
    evidence = 'e3';
    verdict = 'unavailable';
    await new Promise((resolve) => setTimeout(resolve, 80));
    await owner.reconcile();
    assert.equal(owner.view(second).state, 'unavailable');
    assert.match(owner.view(second).lastOutcome, /No usable harness/);
    // The author disappears: Fixer takes over durably, authorship stays.
    exists = false;
    await owner.reconcile();
    assert.equal((await store.outstandingRequests())[0].owner, 'Fixer');
    assert.equal((await store.find(name)).chat.messages[1].sender, '@Accountant');
    // Deterministic domain truth retires the request even while paused, without a model.
    allowed = false;
    obsoleteReason = 'The task was cancelled, so I no longer need this.';
    const before = assessed.length;
    await owner.reconcile();
    assert.equal(assessed.length, before);
    assert.deepEqual(await store.outstandingRequests(), []);
    const chat = (await store.find(name)).chat;
    assert.equal(chat.messages.at(-1).sender, '@Fixer');
    assert.equal(chat.status, 'open');
    // Schedules persist with runtime state.
    assert.ok(JSON.parse(await readFile(`${project.runtime.state}/attention-checks.json`, 'utf8')).version === 1);
});

test('attention ownership reaches every view: Fixer owns system domains, authors own their requests, and agents learn the rules', async (t) => {
    const { store, name } = await twoQuestions(t);
    const pings = (await store.summaries())[0].pings.map((ping) => ({ ...ping, chat: name, title: name, links: [] }));
    const snapshot = {
        blockers: [{ kind: 'setup', title: 'Pre-work check fails', reason: 'x' }],
        health: { incidents: [{ id: 'disk', needsAction: true, severity: 'hard' }] },
        wallet: { state: 'ready', pending: [{ id: 'w1', origin: 'https://bank.example', problem: 'missing', reason: 'x', tasks: ['Pay'], agents: ['Accountant'], createdAt: '', requests: 1 }, { id: 'w2', origin: 'https://tax.example', problem: 'missing', reason: 'x', tasks: [], createdAt: '', requests: 1 }], records: [] },
        chats: { waiting: [], pings },
        queue: [],
        tools: { waiting: { reason: 'No tool' } },
        sync: { state: 'unconfigured' },
    };
    const attention = domainAttention(snapshot);
    assert.deepEqual(attention.chats.owners, ['Accountant']);
    assert.deepEqual(attention.wallet.owners, ['Accountant', 'Fixer'], 'a request without an initiating agent is system-originated');
    for (const domain of ['health', 'harnesses', 'tools', 'sync']) assert.deepEqual(attention[domain].owners, ['Fixer'], domain);
    await until(async () => true, 'noop');
    assert.match(USER_PING_INSTRUCTION, /Fixer owns system-originated requests/);
    assert.match(USER_PING_INSTRUCTION, /no automatic checks while the engine is paused/);
});
