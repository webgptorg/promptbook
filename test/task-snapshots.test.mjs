import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { captureSnapshot, changedPaths } from '../dist/engine/executor.js';
import { createAssignmentTask } from '../dist/engine/generated.js';
import { readTaskBook } from '../dist/tasks/book-task.js';
import { projectAt } from '../dist/project/workspace.js';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

test('task attribution excludes withdrawn untracked files and changes committed by other work, while retaining tracked deletions', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk task snapshots');
    await initRepository(directory);
    await writeFile(join(directory, 'tracked.txt'), 'original\n');
    await git(directory, ['add', '.']);
    await git(directory, ['commit', '-qm', 'Base']);
    await writeFile(join(directory, 'routing.book'), 'temporary routing prerequisite\n');
    await writeFile(join(directory, 'other.txt'), 'another unit will commit this\n');
    const environment = { project: projectAt(directory), repositoryRoot: directory };
    const before = await captureSnapshot(environment);
    await rm(join(directory, 'routing.book'));
    await git(directory, ['add', 'other.txt']);
    await git(directory, ['commit', '-qm', 'Independent work']);
    await rm(join(directory, 'tracked.txt'));
    await writeFile(join(directory, 'result.txt'), 'this task\n');
    const after = await captureSnapshot(environment);
    assert.equal(after['tracked.txt'], null, 'a tracked deletion remains a real pending change');
    assert.deepEqual(changedPaths(before, after), ['result.txt', 'tracked.txt']);
});

test('a Router prerequisite is reserved before publication to concurrent task readers', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk routing publication');
    const target = readTaskBook({ source: 'TASK Needs routing\nGOAL Finish the work.\n', path: join(directory, 'target.book'), relativePath: 'target.book', order: 0, timeZone: 'UTC' });
    let reserved;
    const created = await createAssignmentTask({ target, tasksDirectory: directory, router: 'Router', priority: 1, timeZone: 'UTC', taken: new Set(), reservePath: (path) => { assert.equal(existsSync(path), false); reserved = path; } });
    assert.equal(reserved, created.path);
    assert.match(await readFile(created.path, 'utf8'), /TASK ORIGIN assignment/);
});

test('an untracked dangling symlink remains a versionable change rather than a withdrawn file', { skip: process.platform === 'win32' && 'POSIX symlinks do not require host privilege configuration' }, async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk dangling link');
    await initRepository(directory);
    await symlink('not-created-yet.txt', join(directory, 'link.txt'));
    const snapshot = await captureSnapshot({ project: projectAt(directory), repositoryRoot: directory });
    assert.ok(Object.hasOwn(snapshot, 'link.txt'));
    assert.deepEqual(changedPaths({}, snapshot), ['link.txt']);
});
