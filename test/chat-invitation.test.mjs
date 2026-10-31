import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { findActiveReferences, findAgentReferences } from '../dist/book/references.js';
import { parseChatBook } from '../dist/chats/chat-book.js';
import { appendUserMessage, createUserChat, resolveChatInvitations } from '../dist/chats/service.js';
import { ChatStore } from '../dist/chats/store.js';
import { StateStore } from '../dist/engine/state.js';

const run = promisify(execFile);

/** Names of the agents a message actively invites or addresses. */
function active(text) {
    return findActiveReferences(text).map((reference) => reference.name);
}

/** A catalog with the agents Adam, Frontend Developer and Lawyer, a task and a chat. */
const catalog = {
    index: { names: () => [] },
    resolve: async (reference) => {
        const key = reference.replace(/[@{}\s]/g, '').toLowerCase();
        if (key === 'adam') return { kind: 'agent', definition: { name: 'Adam' } };
        if (key === 'lawyer') return { kind: 'agent', definition: { name: 'Lawyer' } };
        if (key === 'frontenddeveloper') return { kind: 'agent', definition: { name: 'Frontend Developer' } };
        if (key === 'expert') return { kind: 'system-agent', name: 'Expert' };
        if (key === 'user') return { kind: 'system-agent', name: 'User' };
        if (key === 'someTask'.toLowerCase()) return { kind: 'wrong-kind', entry: { relativePath: 'tasks/some.book', kind: 'task' } };
        return { kind: 'not-found' };
    },
};

/** A chat store in a temporary project without automatic commits. */
async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), 'ptbk-invite-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await run('git', ['init', '-q'], { cwd: root });
    const project = { root, runtime: { state: join(root, '.ptbk', 'state'), temporary: join(root, '.ptbk', 'tmp') } };
    return { root, store: new ChatStore(project, { timeZone: 'UTC' }), state: new StateStore(project.runtime.state) };
}

test('active references: the plus prefix is an action only in a valid position', () => {
    assert.deepEqual(active('+@Adam please look'), ['Adam']);
    assert.deepEqual(active('Please ask +{Adam}'), ['Adam']);
    assert.deepEqual(active('Ask +{Frontend Developer} now'), ['Frontend Developer']);
    assert.deepEqual(active('(+@Adam) and\n+@Lawyer, +@Adam again'), ['Adam', 'Lawyer'], 'once per target, after opening punctuation');
    for (const passive of ['@Adam', '{Adam}', 'What did @Adam say?', 'x+@Adam', 'a1+@Adam', '1+{Adam}', '\\+@Adam', '\\+{Adam}', '++@Adam', 'me+@example.com', '+ @Adam', '+{{Adam}}']) {
        assert.deepEqual(active(passive), [], passive);
    }
});

test('active references: code, quotes and illustrative examples never act', () => {
    for (const literal of ['`+@Adam`', '```\n+@Adam\n```', '> +@Adam said', '"+@Adam"', 'he wrote "ask +@Adam" yesterday', '“+@Adam”', 'for example +@Adam', 'Use the syntax +{Frontend Developer}', 'e.g. +@Adam']) {
        assert.deepEqual(active(literal), [], literal);
    }
    assert.deepEqual(active('`+@Adam` is the syntax; now +@Lawyer please'), ['Lawyer']);
});

test('a plus prefix leaves the same passive reference for navigation, with the plus outside its name', () => {
    const [reference] = findAgentReferences('Ask +@Adam.');
    assert.equal(reference.name, 'Adam');
    assert.equal(reference.raw, '@Adam');
    assert.equal(reference.index, 'Ask +'.length);
    assert.equal(findAgentReferences('Mail me+@example.com').length, 0, 'an e-mail-like token is still no reference');
});

test('invitations resolve through the typed resolver: existing members are not duplicated, wrong kinds are refused', async () => {
    const chat = { members: ['@User', '@Chatter', '@Adam'] };
    assert.deepEqual(await resolveChatInvitations(catalog, chat, ['@Adam', '{Frontend Developer}', '@Expert']), { addressed: ['@Adam', '{Frontend Developer}', '@Expert'], joining: ['{Frontend Developer}', '@Expert'] });
    await assert.rejects(resolveChatInvitations(catalog, chat, ['@User']), /cannot speak in a chat/);
    await assert.rejects(resolveChatInvitations(catalog, chat, ['{Some Task}']), /is a task, not an agent/);
    await assert.rejects(resolveChatInvitations(catalog, chat, ['@Nobody']), /no such agent/);
});

test('an invited agent joins before the message, once; history is never interpreted again', async (t) => {
    const { root, store, state } = await fixture(t);
    const created = await createUserChat(store, catalog, '@Adam', 'Hello, please also ask +@Lawyer about this.', { name: 'Contract' });
    const name = created.chat.name;
    assert.deepEqual(created.addressed, ['@Lawyer']);
    assert.deepEqual(created.chat.members, ['@User', '@Adam', '@Lawyer']);
    const invited = await appendUserMessage(store, state, name, 'And +{Frontend Developer}, please check the page. @Nobody is only mentioned.', { catalog });
    assert.deepEqual(invited.replyAgents, ['{Frontend Developer}']);
    assert.equal(invited.needsReply, true);
    assert.deepEqual(invited.written.chat.members, ['@User', '@Adam', '@Lawyer', '{Frontend Developer}']);
    const source = await readFile(join(root, invited.written.relativePath), 'utf8');
    assert.ok(source.indexOf('CHAT MEMBER {Frontend Developer}') < source.indexOf('And +{Frontend Developer}'), 'the join precedes the message');
    assert.deepEqual((await state.readChatAddresses())[name], { upTo: 2, agents: ['{Frontend Developer}'] }, 'the routing survives a restart');
    const again = await appendUserMessage(store, state, name, '+{Frontend Developer} one more thing', { catalog });
    assert.equal(parseChatBook(await readFile(join(root, again.written.relativePath), 'utf8')).members.filter((member) => member === '{Frontend Developer}').length, 1, 'an existing member is addressed without another join');
    await state.settleChatAddress(name, '{Frontend Developer}');
    assert.deepEqual(await state.readChatAddresses(), {});
    const passive = await appendUserMessage(store, state, name, 'What did @Lawyer and +`@Adam` say?', { catalog });
    assert.deepEqual(passive.replyAgents, []);
    assert.equal(passive.replyAgent, '@Adam', 'the main agent answers');
    const before = (await store.find(name)).chat.messages.length;
    await assert.rejects(appendUserMessage(store, state, name, '+{Some Task} do it', { catalog }), /Some Task.*is a task/);
    assert.equal((await store.find(name)).chat.messages.length, before, 'a refused invitation saves nothing');
});
