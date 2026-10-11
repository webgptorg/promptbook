import assert from 'node:assert/strict';
import { constants } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseBook } from '../dist/coder/sources.js';
import { atomicWrite, readJournals, writeJournal } from '../dist/coder/state.js';

/** A journal fixture preserves real binary snapshots without invoking Git or a provider. */
async function fixture(t, bytes = Buffer.from('Original bytes 🦊\0\r\n')) {
    const projectPath = await mkdtemp(path.join(tmpdir(), 'ptbk-state-'));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const workspace = { projectPath, statePath: path.join(projectPath, '.ptbk') };
    const file = { hash: createHash('sha256').update(bytes).digest('hex'), mode: 0o755, kind: 'file', content: bytes.toString('base64') };
    const baseline = { root: projectPath, head: null, index: '', indexFlags: '', dirtyPaths: ['original.bin'], files: { 'original.bin': file } };
    const task = parseBook('TASK Preserve the fixture\n\nKeep the original bytes.\nTASK ID fixture\n', path.join(projectPath, 'task.book'), 'UTC');
    const journal = { version: 1, id: 'fixture', taskId: task.id, occurrenceId: 'occurrence', task, phase: 'claimed', startedAt: 0, updatedAt: 0, dueSlot: 0, baseline, protectedPaths: ['original.bin'], commits: [], attempts: 0 };
    return { workspace, journal, filename: path.join(workspace.statePath, 'journals', 'fixture.json') };
}

test('checkout journals larger than the JavaScript string limit retain compact, deduplicated recovery snapshots', async t => {
    const { workspace, journal, filename } = await fixture(t, Buffer.alloc(768 * 1024, 0xa5));
    const file = journal.baseline.files['original.bin'];
    const count = Math.ceil(constants.MAX_STRING_LENGTH / file.content.length) + 1;
    journal.baseline.files = Object.fromEntries(Array.from({ length: count }, (_, index) => [`asset-${index}.bin`, file]));
    assert.ok(count * file.content.length > constants.MAX_STRING_LENGTH);
    journal.expected = journal.baseline;
    journal.completionRollback = journal.baseline;
    journal.isolation = { view: workspace.projectPath, branch: 'fixture', origin: journal.baseline, sourcePath: 'task.book' };

    await writeJournal(workspace, journal);
    assert.ok((await readFile(filename)).length < 1024 * 1024, 'Snapshot bytes must not be serialized into the journal');
    assert.equal((await readdir(path.join(workspace.statePath, 'snapshot-blobs'))).length, 1);
    assert.deepEqual(await readJournals(workspace), [journal]);
    assert.equal(journal.baseline.files['asset-0.bin'].content, file.content, 'Persisting a journal must not alter its in-memory snapshots');
});

test('existing journals with inline snapshots remain readable and can be saved in the compact format', async t => {
    const { workspace, journal, filename } = await fixture(t);
    await atomicWrite(filename, journal);
    assert.deepEqual(await readJournals(workspace), [journal]);
    await writeJournal(workspace, journal);
    assert.deepEqual(await readJournals(workspace), [journal]);
    const stored = JSON.parse(await readFile(filename, 'utf8'));
    assert.equal(stored.version, 2, 'Older runtimes must reject the new storage format instead of attempting incomplete recovery');
    assert.equal(stored.baseline.files['original.bin'].content, undefined);
    assert.equal(stored.baseline.files['original.bin'].contentRef, journal.baseline.files['original.bin'].hash);
});

test('snapshot persistence retains empty files, symlink targets, modes and successive boundary bytes', async t => {
    const { workspace, journal } = await fixture(t);
    const empty = Buffer.alloc(0);
    const target = Buffer.from('original.bin');
    journal.baseline.files['empty.bin'] = { hash: createHash('sha256').update(empty).digest('hex'), mode: 0o644, kind: 'file', content: '' };
    journal.baseline.files['link'] = { hash: createHash('sha256').update(target).digest('hex'), mode: 0o777, kind: 'symlink', content: target.toString('base64') };
    const changed = Buffer.from('Changed bytes\0\n');
    journal.expected = { ...journal.baseline, files: { ...journal.baseline.files, 'original.bin': { ...journal.baseline.files['original.bin'], hash: createHash('sha256').update(changed).digest('hex'), content: changed.toString('base64') } } };
    await writeJournal(workspace, journal);
    assert.deepEqual(await readJournals(workspace), [journal]);
    assert.equal((await readdir(path.join(workspace.statePath, 'snapshot-blobs'))).length, 4);
});

test('missing or corrupt snapshot bytes block recovery and preserve the journal revision', async t => {
    const { workspace, journal, filename } = await fixture(t);
    await writeJournal(workspace, journal);
    const original = await readFile(filename);
    const blob = path.join(workspace.statePath, 'snapshot-blobs', journal.baseline.files['original.bin'].hash);
    await writeFile(blob, 'Damaged bytes');
    await assert.rejects(readJournals(workspace), /snapshot.*corrupt.*preserved/i);
    await assert.rejects(writeJournal(workspace, { ...journal, phase: 'running' }), /snapshot.*corrupt.*preserved/i);
    assert.deepEqual(await readFile(filename), original);
    await unlink(blob);
    await assert.rejects(readJournals(workspace), /snapshot.*missing.*preserved/i);
    assert.deepEqual(await readFile(filename), original);
});

test('snapshot references refuse path traversal and symlinks without reading or replacing external files', async t => {
    const { workspace, journal, filename } = await fixture(t);
    await writeJournal(workspace, journal);
    const original = await readFile(filename);
    const stored = JSON.parse(original);
    stored.baseline.files['original.bin'].contentRef = '../outside';
    await atomicWrite(filename, stored);
    await assert.rejects(readJournals(workspace), /Invalid recovery snapshot.*preserved/i);
    await writeFile(filename, original);
    const blob = path.join(workspace.statePath, 'snapshot-blobs', journal.baseline.files['original.bin'].hash);
    const target = path.join(workspace.projectPath, 'outside.txt');
    await writeFile(target, 'Preserved external content');
    await unlink(blob);
    await symlink(target, blob);
    await assert.rejects(readJournals(workspace), /snapshot.*corrupt.*preserved/i);
    await assert.rejects(writeJournal(workspace, { ...journal, phase: 'running' }), /snapshot.*corrupt.*preserved/i);
    assert.equal(await readFile(target, 'utf8'), 'Preserved external content');
    assert.deepEqual(await readFile(filename), original);
});
