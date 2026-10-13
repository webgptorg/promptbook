import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    assert.match(help.stdout, /--daemon/);
    assert.match(help.stdout, /--foreground/);
    assert.match(help.stdout, /--raw/);
    assert.doesNotMatch(help.stdout, /answer \[request-id\]/);
    assert.match(help.stdout, /Usage: ptbk start/);
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
        [['start', '--foreground', '--daemon'], /conflicts/],
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

test('unattended installation decisions and nested Back fail or return before destination mutation', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk init decisions '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await assert.rejects(execute(process.execPath, [executable, 'init', '--path', directory, '--non-interactive']), error => {
        assert.equal(error.code, 2); assert.match(error.stderr, /installation local\|global/); return true;
    });
    assert.deepEqual(await readdir(directory), []);
    await execute('git', ['init', '--quiet'], { cwd: directory });
    const before = await readdir(directory);
    const result = await execute(process.execPath, [executable, 'init', '--new-project', 'child', '--nested-strategy', 'back', '--no-install', '--non-interactive'], { cwd: directory });
    assert.match(result.stdout, /cancelled before changing/);
    assert.deepEqual(await readdir(directory), before);
});

test('init persists safe artifacts while generated package edits leave owner staging intact and visibly pending', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk init ownership '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const git = args => execute('git', args, { cwd: directory });
    await git(['init', '--quiet']);
    await git(['config', 'user.name', 'Init fixture']); await git(['config', 'user.email', 'fixture@example.test']);
    await git(['config', 'commit.gpgsign', 'false']); await git(['config', 'core.autocrlf', 'false']);
    const original = JSON.stringify({ name: 'owner-project', scripts: { check: 'node -e "process.exit(0)"' } });
    await writeFile(join(directory, 'package.json'), original);
    await writeFile(join(directory, 'owner.txt'), 'baseline\n');
    await git(['add', 'package.json', 'owner.txt']); await git(['commit', '--quiet', '-m', 'Owner baseline']);
    const edited = JSON.stringify({ name: 'owner-project', scripts: { check: 'node -e "process.exit(0)"', custom: 'owner command' } });
    await writeFile(join(directory, 'package.json'), edited);
    await writeFile(join(directory, 'owner.txt'), 'staged owner edit\n');
    await git(['add', 'package.json', 'owner.txt']);
    const stagedPackage = (await git(['show', ':package.json'])).stdout;
    const stagedOwner = (await git(['show', ':owner.txt'])).stdout;
    const call = () => execute(process.execPath, [executable, 'init', '--path', directory, '--no-install', '--non-interactive'], { cwd: directory, timeout: 30_000 });
    const initialized = await call();
    assert.match(initialized.stdout, /package.json/); assert.match(initialized.stdout, /pending|review/i);
    assert.equal((await git(['show', ':package.json'])).stdout, stagedPackage);
    assert.equal((await git(['show', ':owner.txt'])).stdout, stagedOwner);
    assert.equal((await git(['show', 'HEAD:package.json'])).stdout, original);
    assert.equal(JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')).scripts.custom, 'owner command');
    const head = (await git(['rev-parse', 'HEAD'])).stdout;
    const pending = await readFile(join(directory, '.ptbk', 'initialization-pending.json'), 'utf8');
    await call();
    assert.equal((await git(['rev-parse', 'HEAD'])).stdout, head, 'Repeated setup never makes an empty commit');
    assert.equal(await readFile(join(directory, '.ptbk', 'initialization-pending.json'), 'utf8'), pending);
});
