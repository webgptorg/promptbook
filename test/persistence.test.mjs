import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { agentSubject, commitPaths, prefixedSubject, snapshotDirty, changedSince } from '../dist/project/git.js';
import { batchAgent } from '../dist/chats/batcher.js';
import { validateChoices, parseChatBook, renderChatBook, appendChatMessage, appendChatCommitments, chatAgent, chatAgents, chatDisplayTitle } from '../dist/chats/chat-book.js';
import { ChatStore } from '../dist/chats/store.js';
import { appendUserMessage } from '../dist/chats/service.js';
import { StateStore } from '../dist/engine/state.js';
import { git, GIT_IDENTITY, initRepository, temporaryDirectory } from './helpers.mjs';

test('commit prefix is lowercase and applied exactly once', () => {
    assert.equal(prefixedSubject('Add task - X'), 'ptbk: Add task - X');
    assert.equal(prefixedSubject('ptbk: Add task - X'), 'ptbk: Add task - X');
    assert.equal(prefixedSubject('PTBK: Add task - X'), 'ptbk: Add task - X', 'an older uppercase prefix is not repeated');
});

test('agent work subjects quote the static agent visual; system subjects invent no agent or date', () => {
    assert.equal(prefixedSubject(agentSubject('Expert', 'Review export')), 'ptbk: `~<@@/>-` Review export');
    assert.equal(prefixedSubject(agentSubject('@Expert', 'Review export')), prefixedSubject(agentSubject('{Expert}', 'Review export')), 'equivalent references share one visual');
    assert.equal(prefixedSubject(agentSubject(undefined, 'Initialize project')), 'ptbk: Initialize project');
    assert.equal(prefixedSubject(agentSubject('Developer', 'Write the page — 2026-10-28 13:00:00')), prefixedSubject(agentSubject('Developer', 'Write the page — 2026-10-28 13:00:00')), 'stable, no animation frame');
    assert.match(prefixedSubject(agentSubject('Developer', 'Write the page')), /^ptbk: `[^`\s]+` Write the page$/);
});

test('a chat batch names the one agent whose replies it adds', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    const path = join(root, 'chat.book');
    await writeFile(path, renderChatBook({ name: 'Talk', members: ['@User', '@Chatter'], status: 'open', messages: [{ sender: '@User', at: '2026-10-28T13:00:00Z', text: 'Hi' }] }));
    assert.equal(await batchAgent(root, path), undefined, 'only User messages: a system subject');
    await git(root, ['add', '.']);
    await git(root, ['commit', '-qm', 'base']);
    await writeFile(path, appendChatMessage(await readFile(path, 'utf8'), { sender: '@Chatter', at: '2026-10-28T13:01:00Z', text: 'Hello' }));
    assert.equal(await batchAgent(root, path), 'Chatter');
    await writeFile(path, appendChatMessage(await readFile(path, 'utf8'), { sender: '@Developer', at: '2026-10-28T13:02:00Z', text: 'Me too' }));
    assert.equal(await batchAgent(root, path), undefined, 'several replying agents keep their authorship in the Book, not one invented subject agent');
});

test('scoped commits keep unrelated staged and unstaged work, and never create empty commits', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await writeFile(join(root, 'base.txt'), 'base\n');
    await git(root, ['add', '.']);
    await git(root, ['commit', '-qm', 'base']);
    await writeFile(join(root, 'staged.txt'), 'user staged\n');
    await git(root, ['add', 'staged.txt']);
    await writeFile(join(root, 'base.txt'), 'user unstaged edit\n');
    await mkdir(join(root, 'dir with space'), { recursive: true });
    await writeFile(join(root, 'dir with space', 'owned [1].txt'), 'owned\n');
    const env = { ...process.env, ...GIT_IDENTITY };
    const outcome = await commitPaths({ projectRoot: root, repositoryRoot: root, paths: [join(root, 'dir with space', 'owned [1].txt')], subject: 'Owned change', body: 'Assignment body', trailers: { 'PTBK-Run': 'abc' }, temporaryDirectory: join(root, '.ptbk', 'tmp'), env });
    assert.equal(outcome.committed, true);
    assert.equal((await git(root, ['show', '--name-only', '--format=%s', 'HEAD'])).trim(), 'ptbk: Owned change\n\ndir with space/owned [1].txt');
    assert.match(await git(root, ['log', '-1', '--format=%B']), /Assignment body\n\nPTBK-Run: abc/);
    const status = await git(root, ['status', '--porcelain']);
    assert.match(status, /^A  staged\.txt$/m, 'user staging survives');
    assert.match(status, /^ M base\.txt$/m, 'user edit survives');
    const empty = await commitPaths({ projectRoot: root, repositoryRoot: root, paths: [join(root, 'dir with space', 'owned [1].txt')], subject: 'Nothing', temporaryDirectory: join(root, '.ptbk', 'tmp'), env });
    assert.equal(empty.committed, false);
});

test('a failing hook is a persistence failure that preserves the changes', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await writeFile(join(root, 'file.txt'), 'x\n');
    const hook = join(root, '.git', 'hooks', 'pre-commit');
    await writeFile(hook, '#!/bin/sh\necho "hook says no" >&2\nexit 1\n');
    await chmod(hook, 0o755);
    if (process.platform === 'win32') return;
    await assert.rejects(
        commitPaths({ projectRoot: root, repositoryRoot: root, paths: [join(root, 'file.txt')], subject: 'Blocked', temporaryDirectory: join(root, '.ptbk', 'tmp'), env: { ...process.env, ...GIT_IDENTITY } }),
        (error) => error.details?.kind === 'persistence' && /hook says no/.test(error.details.reason),
    );
    assert.match(await git(root, ['status', '--porcelain']), /file\.txt/);
});

test('dirty snapshots detect exactly the paths a task changed', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await writeFile(join(root, 'user.txt'), 'user\n');
    const before = await snapshotDirty(root, root);
    await writeFile(join(root, 'agent.txt'), 'agent\n');
    const after = await snapshotDirty(root, root);
    assert.deepEqual(changedSince(before, after), [join(root, 'agent.txt')]);
});

test('chats: offered answers are validated; every human-facing message is one commit; stale clients and invalid recovery answers are refused', async (t) => {
    assert.equal(validateChoices(['red', 'blue']), undefined);
    assert.match(validateChoices(['red', 'red']), /Duplicate/);
    assert.match(validateChoices(['   ']), /readable/);
    assert.match(validateChoices(['two\nlines']), /single line/);
    assert.match(validateChoices(Array.from({ length: 51 }, (_, index) => `c${index}`)), /At most 50/);
    assert.match(validateChoices(['x'.repeat(1001)]), /1000/);
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await writeFile(join(root, 'base.txt'), 'base\n');
    await git(root, ['add', '.']);
    await git(root, ['commit', '-qm', 'base']);
    const project = { root, runtime: { state: join(root, '.ptbk', 'state'), temporary: join(root, '.ptbk', 'tmp') } };
    const store = new ChatStore(project, {
        timeZone: 'UTC',
        persistence: {
            commit: async (paths, subject, trailers) => {
                const outcome = await commitPaths({ projectRoot: root, repositoryRoot: root, paths, subject, trailers, temporaryDirectory: join(root, '.ptbk', 'tmp'), env: { ...process.env, ...GIT_IDENTITY } });
                return outcome.committed ? outcome.sha : undefined;
            },
        },
    });
    const state = new StateStore(project.runtime.state);
    const created = await store.create({ name: 'Fixer asks: Retry?', members: ['@User', '@Fixer'], status: 'waiting-for-user', links: ['{Broken task}'], messages: [{ sender: '@Fixer', text: 'The task failed. How should I continue?', choices: ['Retry the task', 'Acknowledge the failure'] }] });
    assert.ok(created.commit, 'creation is committed');
    await state.writeParked({ version: 1, runId: 'r', taskRef: '{Broken task}', taskKey: 'brokentask', taskTitle: 'Broken task', sourcePath: 'tasks/broken.book', kind: 'task', phase: 'failed', attempt: 3, technicalRetries: 0, routing: { agent: '@Fixer', harness: 'openai-codex' }, preSnapshot: {}, createdPaths: [], completionApplied: false, recoveryChat: created.chat.name, awaitedMessages: 1, noCommit: false, instanceId: 'x', startedAt: '', updatedAt: '', history: [] });
    await assert.rejects(appendUserMessage(store, state, created.chat.name, 'Maybe later'), /not one of the offered answers/);
    await assert.rejects(appendUserMessage(store, state, created.chat.name, 'Retry the task', { expected: 0 }), /changed since it was displayed/);
    const commitsBefore = (await git(root, ['rev-list', '--count', 'HEAD'])).trim();
    const answered = await appendUserMessage(store, state, created.chat.name, 'Retry the task', { expected: 1 });
    assert.equal(answered.answered, true);
    assert.equal(answered.needsReply, false, 'the waiting task resumes instead of an agent turn');
    assert.equal(answered.written.chat.status, 'open');
    assert.equal(Number((await git(root, ['rev-list', '--count', 'HEAD'])).trim()), Number(commitsBefore) + 1, 'the answer is exactly one commit');
    const message = await git(root, ['log', '-1', '--format=%B']);
    assert.match(created.chat.name, /^Fixer asks: Retry\? — \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'a new chat gets its creation date/time in its name');
    assert.ok(message.includes(`ptbk: Chat - ${created.chat.name}\n`), message);
    assert.ok(message.includes(`Chat-Name: ${created.chat.name}\n`), message);
    assert.equal(answered.written.chat.name, created.chat.name, 'appending never renames the chat');
    assert.match(message, /^Task-Name: Broken task$/m);
    await assert.rejects(appendUserMessage(store, state, created.chat.name, 'Acknowledge the failure', { expected: 1 }), /changed since it was displayed/, 'a stale second answer is never applied');
    await store.markRead(created.chat.name);
    assert.equal((await git(root, ['rev-list', '--count', 'HEAD'])).trim(), String(Number(commitsBefore) + 1), 'reading creates no commit');
});

test('chat Books round-trip losslessly, including text that looks like commitments, choices or fences', () => {
    const tricky = 'CHAT MESSAGE @Fixer 2026-01-01T00:00:00Z\n» not a choice\n\\ backslash line\n```\nTASK AGENT @Nobody\n\n\ntrailing spaces   ';
    let source = renderChatBook({ name: 'Edge cases', members: ['@User', '@Developer'], status: 'open', links: ['{Some task}'], messages: [{ sender: '@User', at: '2026-10-17T10:00:00+02:00', text: tricky }] });
    source = appendChatMessage(source, { sender: '@Developer', at: '2026-10-17T10:01:00+02:00', text: 'Pick one.', choices: ['A', 'B'] }, 'waiting-for-user');
    const chat = parseChatBook(source);
    assert.equal(chat.name, 'Edge cases');
    assert.equal(chat.status, 'waiting-for-user');
    assert.deepEqual(chat.members, ['@User', '@Developer']);
    assert.deepEqual(chat.links, ['{Some task}']);
    assert.equal(chat.messages.length, 2);
    assert.equal(chat.messages[0].text, tricky);
    assert.equal(chat.messages[0].sender, '@User');
    assert.deepEqual(chat.messages[1].choices, ['A', 'B']);
    assert.equal(chat.messages[1].text, 'Pick one.');
    assert.deepEqual(chat.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
});

test('CHAT TITLE evolves the presentation, joined agents keep the main agent, and progress/final phases round-trip', () => {
    let source = renderChatBook({ name: 'Discuss CSV export — 2026-10-25 23:40:00', members: ['@User', '@Chatter'], status: 'open', messages: [{ sender: '@User', at: '2026-10-25T23:40:00+01:00', text: 'Please add multiline CSV export.\nCHAT TITLE not a title' }] });
    assert.equal(chatDisplayTitle(parseChatBook(source)), 'Discuss CSV export — 2026-10-25 23:40:00', 'without a title the declared name is shown');
    source = appendChatCommitments(source, ['LINK {Add multiline CSV export — 2026-10-25 23:41:00}', 'CHAT MEMBER @Developer']);
    source = appendChatMessage(source, { sender: '@Developer', at: '2026-10-25T23:42:00+01:00', text: 'Looking at the exporter…', phase: 'progress' });
    source = appendChatMessage(source, { sender: '@Developer', at: '2026-10-25T23:43:00+01:00', text: 'Should the export preserve the existing column order?', phase: 'final' }, 'waiting-for-user');
    source = appendChatCommitments(source, ['CHAT TITLE CSV export', 'CHAT TITLE Multiline CSV export and column order']);
    const chat = parseChatBook(source);
    assert.equal(chat.name, 'Discuss CSV export — 2026-10-25 23:40:00', 'a title never renames the chat');
    assert.equal(chat.title, 'Multiline CSV export and column order', 'the latest title wins');
    assert.equal((source.match(/^CHAT TITLE /gm) ?? []).length, 2, 'earlier titles stay in the Book');
    assert.deepEqual(chat.members, ['@User', '@Chatter', '@Developer']);
    assert.equal(chatAgent(chat), '@Chatter', 'the first agent stays the main agent');
    assert.deepEqual(chatAgents(chat), ['@Chatter', '@Developer']);
    assert.deepEqual(chat.links, ['{Add multiline CSV export — 2026-10-25 23:41:00}']);
    assert.deepEqual(chat.messages.map((message) => [message.sender, message.phase]), [['@User', undefined], ['@Developer', 'progress'], ['@Developer', 'final']]);
    assert.equal(chat.messages[0].text, 'Please add multiline CSV export.\nCHAT TITLE not a title', 'literal text inside a message is never a title');
    assert.equal(chat.messages[2].text, 'Should the export preserve the existing column order?');
    assert.ok(source.indexOf('CHAT MEMBER @Developer') < source.indexOf('CHAT MESSAGE @Developer'), 'a joining agent is declared before its first message');
    assert.deepEqual(chat.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
});
