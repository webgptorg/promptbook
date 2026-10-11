import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { daemonLogWriter } from '../dist/coder/logging.js';

test('daemon diagnostic rotation stays bounded and marks truncation without erasing recovery evidence', async t => {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk logs '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const statePath = join(projectPath, '.ptbk');
    await mkdir(statePath);
    const append = daemonLogWriter({ projectPath, statePath }, 256);
    append('First diagnostic\n');
    append('👋'.repeat(200));
    assert.match(await readFile(join(statePath, 'service.log'), 'utf8'), /Diagnostic output truncated/);
    assert.doesNotMatch(await readFile(join(statePath, 'service.log'), 'utf8'), /�/);
    assert.equal(await readFile(join(statePath, 'service.log.1'), 'utf8'), 'First diagnostic\n');
    for (let index = 0; index < 30; index++) append(`event ${index}: ${'x'.repeat(60)}\n`);
    assert.deepEqual((await readdir(statePath)).sort(), ['service.log', 'service.log.1']);
    for (const name of await readdir(statePath)) assert.ok((await readFile(join(statePath, name))).length <= 256);
});

test('daemon log sinks refuse a symlink rather than writing outside runtime state', async t => {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk log boundary '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const statePath = join(projectPath, '.ptbk'); await mkdir(statePath);
    const target = join(projectPath, 'user.txt');
    await symlink(target, join(statePath, 'service.log'));
    assert.throws(() => daemonLogWriter({ projectPath, statePath })('private log'), /non-file daemon log/);
});
