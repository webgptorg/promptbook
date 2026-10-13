import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { replaceFileWithRetry } from '../dist/coder/file-replacement.js';
import { assignTaskId, discoverTasks, recordTaskCompletion } from '../dist/coder/sources.js';

/** A real task file keeps sharing-failure fixtures independent of the host platform. */
async function fixture(t, content = 'TASK Atomic 🦊\r\n\r\nKeep the original assignment.\r\nTASK ID atomic\r\nTASK NOTE preserve this metadata\r\n') {
    const root = await mkdtemp(path.join(os.tmpdir(), 'ptbk-source-replace-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const workspace = { projectPath: root, tasksPath: path.join(root, 'tasks'), legacyPath: path.join(root, 'prompts'), statePath: path.join(root, '.ptbk'), timezone: 'UTC' };
    await mkdir(workspace.tasksPath);
    const filename = path.join(workspace.tasksPath, 'work.book');
    await writeFile(filename, content);
    const [task] = await discoverTasks(workspace);
    assert.equal(task.diagnostics.length, 0);
    return { workspace, filename, task, original: Buffer.from(content) };
}

/** Simulate the Windows sharing errors returned by Node's rename operation. */
function sharingError(code = 'EPERM') {
    return Object.assign(new Error('Task source is held by a reader'), { code });
}

test('task completion retries Windows sharing failures with one complete candidate and one completion stamp', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    const stamp = '2026-10-13T12:34:56.789Z';
    const candidates = new Set();
    const waits = [];
    let attempts = 0;
    let candidate;
    const completed = await recordTaskCompletion(task, stamp, {
        platform: 'win32',
        sleep: async milliseconds => { waits.push(milliseconds); assert.deepEqual(await readFile(filename), original); },
        rename: async (source, destination) => {
            assert.equal(destination, filename);
            assert.deepEqual(await readFile(filename), original);
            candidates.add(source);
            const bytes = await readFile(source);
            candidate ??= bytes;
            assert.deepEqual(bytes, candidate);
            assert.ok(bytes.subarray(0, original.length).equals(original));
            if (++attempts < 4) throw sharingError(['EPERM', 'EBUSY', 'EACCES'][attempts - 1]);
            await replaceFileWithRetry(source, destination);
        },
    });
    assert.equal(attempts, 4);
    assert.equal(candidates.size, 1);
    assert.deepEqual(waits, [20, 40, 80]);
    assert.deepEqual(completed.doneTimestamps, [stamp]);
    assert.equal(completed.status, 'done');
    const saved = await readFile(filename, 'utf8');
    assert.equal(saved.match(/^TASK DONE /gm).length, 1);
    assert.equal(saved.match(/^TASK NOTE ptbk-completion-source /gm).length, 1);
    assert.ok(saved.includes(`TASK DONE ${stamp}\r\n`));
    assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
});

test('persistent Windows source locks stop within the retry bound and retain the original bytes', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    let attempts = 0;
    const waits = [];
    await assert.rejects(recordTaskCompletion(task, '2026-10-13T12:34:56Z', {
        platform: 'win32',
        sleep: async milliseconds => { waits.push(milliseconds); },
        rename: async () => { attempts++; assert.deepEqual(await readFile(filename), original); throw sharingError(); },
    }), /held by a reader/);
    assert.equal(attempts, 10);
    assert.ok(waits.reduce((sum, milliseconds) => sum + milliseconds, 0) <= 2000);
    assert.deepEqual(await readFile(filename), original);
    assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
});

test('a user edit during a Windows sharing retry aborts replacement without overwriting the edit', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    const edited = Buffer.concat([original, Buffer.from('User changed the assignment during the retry.\r\n')]);
    let attempts = 0;
    await assert.rejects(recordTaskCompletion(task, '2026-10-13T12:34:56Z', {
        platform: 'win32',
        sleep: async () => { await writeFile(filename, edited); },
        rename: async () => { attempts++; throw sharingError(); },
    }), /Source changed concurrently/);
    assert.equal(attempts, 1);
    assert.deepEqual(await readFile(filename), edited);
    assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
});

test('lost mutation ownership during a sharing retry prevents a second source replacement attempt', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    let owned = true;
    let attempts = 0;
    await assert.rejects(recordTaskCompletion(task, '2026-10-13T12:34:56Z', {
        platform: 'win32',
        assertOwned: async () => { if (!owned) throw Object.assign(new Error('Mutation lease was lost'), { code: 'EPERM' }); },
        sleep: async () => { owned = false; },
        rename: async () => { attempts++; throw sharingError(); },
    }), /Mutation lease was lost/);
    assert.equal(attempts, 1);
    assert.deepEqual(await readFile(filename), original);
    assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
});

test('a task source swapped for a symlink during a sharing wait cannot replace its target', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    const protectedFile = path.join(workspace.tasksPath, 'protected.txt');
    const probe = path.join(workspace.tasksPath, 'probe');
    const protectedBytes = Buffer.from('User-owned file remains untouched.\n');
    await writeFile(protectedFile, protectedBytes);
    try { await symlink(protectedFile, probe, 'file'); }
    catch (error) { if (error.code === 'EPERM' || error.code === 'EACCES') { t.skip('Host does not permit creating symbolic links'); return; } throw error; }
    await rm(probe);
    const backup = path.join(workspace.tasksPath, 'backup.book');
    let attempts = 0;
    await assert.rejects(recordTaskCompletion(task, '2026-10-13T12:34:56Z', {
        platform: 'win32',
        sleep: async () => { await rename(filename, backup); await symlink(protectedFile, filename, 'file'); },
        rename: async () => { attempts++; throw sharingError(); },
    }), /symbolic link task source/);
    assert.equal(attempts, 1);
    assert.ok((await lstat(filename)).isSymbolicLink());
    assert.deepEqual(await readFile(backup), original);
    assert.deepEqual(await readFile(protectedFile), protectedBytes);
    assert.deepEqual(await readdir(workspace.tasksPath), ['backup.book', 'protected.txt', 'work.book']);
});

test('ordinary permission failures and non-sharing errors do not retry source replacement', async t => {
    const { workspace, filename, task, original } = await fixture(t);
    for (const [platform, code] of [['linux', 'EACCES'], ['win32', 'ENOENT']]) {
        let attempts = 0;
        await assert.rejects(recordTaskCompletion(task, '2026-10-13T12:34:56Z', {
            platform,
            sleep: async () => { assert.fail('This error must not be retried'); },
            rename: async () => { attempts++; throw sharingError(code); },
        }), error => error.code === code);
        assert.equal(attempts, 1);
        assert.deepEqual(await readFile(filename), original);
        assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
    }
});

test('stable task ID materialization and legacy completion use the same sharing retry protection', async t => {
    const { workspace, filename, task } = await fixture(t, 'TASK Unnamed identity\nAssignment stays unchanged.\n');
    let attempts = 0;
    const options = {
        platform: 'win32', sleep: async () => {},
        rename: async (source, destination) => { if (++attempts % 2) throw sharingError(); await replaceFileWithRetry(source, destination); },
    };
    const identified = await assignTaskId(task, options);
    assert.equal(identified.id, task.id);
    assert.equal(identified.source.explicitId, true);
    assert.equal((await readFile(filename, 'utf8')).match(/^TASK ID /gm).length, 1);
    await mkdir(workspace.legacyPath);
    const legacyFile = path.join(workspace.legacyPath, 'legacy.md');
    await writeFile(legacyFile, '[ ]\r\nLegacy assignment.\r\n');
    const legacy = (await discoverTasks(workspace)).find(item => item.source.format === 'markdown');
    const completed = await recordTaskCompletion(legacy, '2026-10-13T12:34:56Z', options);
    assert.equal(attempts, 4);
    assert.equal(completed.status, 'done');
    assert.equal(await readFile(legacyFile, 'utf8'), '[x]\r\nLegacy assignment.\r\n');
    assert.deepEqual(await readdir(workspace.tasksPath), ['work.book']);
    assert.deepEqual(await readdir(workspace.legacyPath), ['legacy.md']);
});
