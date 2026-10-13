import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { replaceFileWithRetry } from '../dist/coder/file-replacement.js';
import { saveTaskEdit } from '../dist/coder/service.js';

/** Create a real project-local task source for deterministic file-sharing failures. */
async function fixture(t) {
    const projectPath = await realpath(await mkdtemp(path.join(tmpdir(), 'ptbk-edit-')));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const directory = path.join(projectPath, 'tasks');
    await mkdir(directory);
    const sourcePath = path.join(directory, 'target.book');
    const previous = Buffer.from('TASK Original\n\nPreserve this assignment.\nTASK ID original\n');
    await writeFile(sourcePath, previous);
    return { workspace: { projectPath }, directory, sourcePath, previous };
}

test('dashboard edits retry Windows sharing conflicts without exposing partial source or losing writer checks', async t => {
    const { workspace, directory, sourcePath, previous } = await fixture(t);
    const content = previous.toString().replace('Original', 'Edited 漢😀');
    let ownershipChecks = 0; let attempts = 0;
    const temporaryFiles = new Set();
    await saveTaskEdit(workspace, sourcePath, previous, content, { assertOwned: async () => { ownershipChecks++; } }, {
        platform: 'win32', sleep: async () => {},
        rename: async (temporary, destination) => {
            assert.equal(destination, sourcePath);
            assert.equal(ownershipChecks, ++attempts, 'Every replacement attempt rechecks ownership');
            assert.deepEqual(await readFile(sourcePath), previous, 'The original source remains complete until successful replacement');
            assert.equal(await readFile(temporary, 'utf8'), content);
            temporaryFiles.add(temporary);
            if (attempts < 4) throw Object.assign(new Error('Transient reader sharing conflict'), { code: ['EPERM', 'EBUSY', 'EACCES'][attempts - 1] });
            await replaceFileWithRetry(temporary, destination);
        },
    });
    assert.equal(attempts, 4);
    assert.equal(temporaryFiles.size, 1);
    assert.equal(await readFile(sourcePath, 'utf8'), content);
    assert.deepEqual(await readdir(directory), ['target.book']);
});

test('dashboard edits preserve concurrent user changes made during a sharing retry', async t => {
    const { workspace, directory, sourcePath, previous } = await fixture(t);
    const editorContent = 'TASK User edit\n\nPreserve the editor\'s new assignment.\n';
    let attempts = 0;
    await assert.rejects(saveTaskEdit(workspace, sourcePath, previous, 'TASK Dashboard edit\n', { assertOwned: async () => {} }, {
        platform: 'win32',
        rename: async () => { attempts++; throw Object.assign(new Error('Sharing conflict'), { code: 'EPERM' }); },
        sleep: async () => { await writeFile(sourcePath, editorContent); },
    }), /Source changed while saving/);
    assert.equal(attempts, 1, 'A changed source is never replaced by a retry');
    assert.equal(await readFile(sourcePath, 'utf8'), editorContent);
    assert.deepEqual(await readdir(directory), ['target.book']);
});

test('dashboard edits stop replacing files after ownership is lost during a sharing retry', async t => {
    const { workspace, directory, sourcePath, previous } = await fixture(t);
    let owned = true; let ownershipChecks = 0; let attempts = 0;
    await assert.rejects(saveTaskEdit(workspace, sourcePath, previous, 'TASK Dashboard edit\n', {
        assertOwned: async () => { ownershipChecks++; if (!owned) throw new Error('Workspace ownership changed'); },
    }, {
        platform: 'win32',
        rename: async () => { attempts++; throw Object.assign(new Error('Sharing conflict'), { code: 'EPERM' }); },
        sleep: async () => { owned = false; },
    }), /Workspace ownership changed/);
    assert.equal(ownershipChecks, 2);
    assert.equal(attempts, 1, 'A stale writer never attempts the next replacement');
    assert.deepEqual(await readFile(sourcePath), previous);
    assert.deepEqual(await readdir(directory), ['target.book']);
});

test('dashboard edit failures preserve the original source and remove only the proposed temporary file', async t => {
    const { workspace, directory, sourcePath, previous } = await fixture(t);
    let attempts = 0;
    await assert.rejects(saveTaskEdit(workspace, sourcePath, previous, 'TASK Dashboard edit\n', { assertOwned: async () => {} }, {
        platform: 'win32', sleep: async () => {},
        rename: async () => { attempts++; throw Object.assign(new Error('Source remains locked'), { code: 'EPERM' }); },
    }), /Source remains locked/);
    assert.equal(attempts, 10);
    assert.deepEqual(await readFile(sourcePath), previous);
    assert.deepEqual(await readdir(directory), ['target.book']);
});
