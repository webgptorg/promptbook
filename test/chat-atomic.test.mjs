import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChatStore } from '../dist/chats/store.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory } from './helpers.mjs';

test('independent chat readers always retain the accepted conversation while a reply streams to disk', async (t) => {
    const project = projectAt(await temporaryDirectory(t, 'ptbk atomic chats'));
    const writer = new ChatStore(project, { timeZone: 'UTC' });
    const reader = new ChatStore(project, { timeZone: 'UTC' });
    const created = await writer.create({ name: 'Remember this', members: ['@User', '@Developer'], status: 'open', messages: [{ sender: '@User', text: 'The accepted message' }] });
    let completed = false;
    const writing = (async () => {
        for (let index = 0; index < 12; index++) {
            await writer.upsertProgress(created.chat.name, { sender: '@Developer', at: '2026-11-03T10:00:00Z', text: `${index}: ${'streamed reply '.repeat(40_000)}` });
        }
    })().finally(() => { completed = true; });
    let reads = 0;
    try {
        do {
            const [stored] = await reader.list();
            assert.equal(stored?.chat.name, created.chat.name, 'a live reader never observes a missing or truncated chat');
            assert.equal(stored.chat.messages[0]?.text, 'The accepted message');
            reads++;
        } while (!completed);
    } finally { await writing; }
    assert.ok(reads > 1, 'the independent reader inspected the chat during streaming writes');
});
