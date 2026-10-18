import assert from 'node:assert/strict';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { commitPaths, prefixedSubject, snapshotDirty, changedSince } from '../dist/project/git.js';
import { validateChoices, parseChatBook, renderChatBook, appendChatMessage } from '../dist/chats/chat-book.js';
import { ChatStore } from '../dist/chats/store.js';
import { appendUserMessage } from '../dist/chats/service.js';
import { StateStore } from '../dist/engine/state.js';
import { git, GIT_IDENTITY, initRepository, temporaryDirectory } from './helpers.mjs';

test('commit prefix is applied exactly once', () => {
    assert.equal(prefixedSubject('Add task - X'), 'PTBK: Add task - X');
    assert.equal(prefixedSubject('PTBK: Add task - X'), 'PTBK: Add task - X');
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
    assert.equal((await git(root, ['show', '--name-only', '--format=%s', 'HEAD'])).trim(), 'PTBK: Owned change\n\ndir with space/owned [1].txt');
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
    assert.ok(message.includes(`PTBK: Chat - ${created.chat.name}\n`), message);
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
