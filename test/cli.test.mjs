import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { installedVersion } from '../dist/cli.js';

/** Spawn the executable in external projects rather than sharing process exit state. */
const execute = promisify(execFile);
/** Resolve the built executable from this test's installation. */
const executable = fileURLToPath(new URL('../bin/ptbk.js', import.meta.url));

test('CLI version, command help and bare invocation inspect an external project without writes', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk cli '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const version = await execute(process.execPath, [executable, '--version'], { cwd: directory });
    assert.equal(version.stdout.trim(), await installedVersion());
    const help = await execute(process.execPath, [executable, 'start', '--help', '--path', directory], { cwd: directory });
    assert.match(help.stdout, /Usage: ptbk/);
    assert.match(help.stdout, /--daemon.*--raw.*--interactive/);
    assert.match(help.stdout, /answer \[request-id\]/);
    assert.doesNotMatch(help.stdout, /implementation pending|not implemented/);
    const root = await execute(process.execPath, [executable, '--path', directory], { cwd: directory, timeout: 5_000 });
    assert.match(root.stdout, /ptbk start/);
    assert(root.stdout.includes(directory));
    for (const command of ['status', 'show', 'list', 'run']) {
        const args = [executable, command, '--path', directory, ...(command === 'run' ? ['--dry-run'] : [])];
        await execute(process.execPath, args, { cwd: directory, timeout: 5_000 });
    }
    assert.deepEqual(await readdir(directory), []);
});

test('unknown options and invalid mode combinations fail before mutation', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk invalid '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    for (const [args, message] of [
        [['coder'], /coder command group was replaced/],
        [['--typo'], /Unsupported option/],
        [['--path'], /requires a value/],
        [['start', 'unexpected'], /Unexpected arguments/],
        [['start', '--raw', '--daemon'], /Choose only one/],
        [['start', '--no-server', '--port', '3000'], /conflicts/],
        [['start', '--no-commit'], /requires commits/],
        [['run', '--model', ''], /nonempty value/],
        [['start', '--limit', '1'], /indefinite/],
        [['start', '--browser-mode', 'invalid'], /headless or headful/],
        [['start', '--interactive'], /interactive terminal/],
    ]) {
        await assert.rejects(execute(process.execPath, [executable, ...args, '--path', directory], { cwd: directory }), error => {
            assert.equal(error.code, 2);
            assert.match(error.stderr, message);
            return true;
        });
    }
    assert.deepEqual(await readdir(directory), []);
});

test('external project init is repeatable and add/list/dry-run work without provider inference', async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk init '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const cli = args => execute(process.execPath, [executable, ...args, '--path', directory], { cwd: directory, timeout: 90_000 });
    await cli(['initialize', '--no-install', '--no-questions']);
    const core = await readFile(join(directory, 'agents', '.core', 'adam.book'), 'utf8');
    await cli(['init', '--no-install', '--no-questions']);
    assert.equal(await readFile(join(directory, 'agents', '.core', 'adam.book'), 'utf8'), core);
    await cli(['add', 'Implement a deterministic fixture', '--no-questions']);
    const list = JSON.parse((await cli(['list', '--json'])).stdout);
    const task = list.tasks.find(item => item.title === 'Implement a deterministic fixture');
    assert.ok(task, 'Added task is discoverable');
    const preview = JSON.parse((await cli(['run', '--dry-run', '--json'])).stdout);
    assert.deepEqual(preview.tasks.map(({ dueSlot, ...row }) => row), list.tasks.map(({ dueSlot, ...row }) => row));
    const answer = await cli(['answer']);
    assert.deepEqual(JSON.parse(answer.stdout), []);
});
