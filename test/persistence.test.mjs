import assert from 'node:assert/strict';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { commitPaths, prefixedSubject, snapshotDirty, changedSince } from '../dist/project/git.js';
import { RequestStore, validateChoices } from '../dist/engine/requests.js';
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

test('requests: declared answers are validated; a reply applies once; late answers are refused', async (t) => {
    assert.equal(validateChoices(['red', 'blue']), undefined);
    assert.match(validateChoices(['red', 'red']), /Duplicate/);
    assert.match(validateChoices(['   ']), /readable/);
    assert.match(validateChoices(Array.from({ length: 51 }, (_, index) => `c${index}`)), /At most 50/);
    assert.match(validateChoices(['x'.repeat(1001)]), /1000/);
    const root = await temporaryDirectory(t);
    const store = new RequestStore(join(root, 'requests'));
    const request = await store.create({ kind: 'question', reason: 'Need input', question: 'Color?', choices: ['red', 'blue'], origin: { kind: 'task', taskRef: '#t' }, blocking: true });
    await assert.rejects(store.resolve(request.id, { status: 'answered', answer: 'green', via: 'cli' }), /not one of the declared answers/);
    const answered = await store.resolve(request.id, { status: 'answered', answer: 'red', via: 'browser' });
    assert.equal(answered.status, 'answered');
    await assert.rejects(store.resolve(request.id, { status: 'answered', answer: 'blue', via: 'api' }), /already answered via browser/);
    assert.equal((await store.list({ status: 'pending' })).length, 0);
});
