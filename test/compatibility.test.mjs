import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { BIN, ROOT, git, initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';
import { ENGINE_VERSION } from '../dist/common/version.js';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Version of the simulated other installation.
 */
const OTHER_VERSION = '99.0.0-other';

/**
 * Copies the built engine into a separate installation with another version and an older control contract, like a
 * service started by a previously installed (or linked) ptbk.
 */
async function otherInstallation(t, version = OTHER_VERSION) {
    const beforeRemoval = [];
    const root = join(await temporaryDirectory(t, 'ptbk other installation', beforeRemoval), 'ptbk');
    await cp(join(ROOT, 'bin'), join(root, 'bin'), { recursive: true });
    await cp(join(ROOT, 'dist'), join(root, 'dist'), { recursive: true });
    const manifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ ...manifest, version }, null, 4));
    // A junction needs no elevated rights on Windows and lets the copy resolve its runtime dependencies.
    const modules = join(root, 'node_modules');
    await symlink(join(ROOT, 'node_modules'), modules, 'junction');
    // Remove only the link itself before the copy is deleted, never the checkout's dependencies behind it.
    beforeRemoval.push(() => unlink(modules));
    const control = join(root, 'dist', 'service', 'control.js');
    const source = await readFile(control, 'utf8');
    assert.match(source, /CONTROL_CONTRACT = \d+;/);
    await writeFile(control, source.replace(/CONTROL_CONTRACT = \d+;/, 'CONTROL_CONTRACT = 1;'));
    return { root, bin: join(root, 'bin', 'ptbk.js') };
}

/**
 * Runs the other installation's CLI.
 */
function runOther(bin, args, options) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [bin, ...args], { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
        child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
        child.once('close', (code) => resolve({ code, output }));
    });
}

test('another ptbk version: viewers open the service through its own installation; one-shot results never misrender it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const other = await otherInstallation(t);
    const started = await runOther(other.bin, ['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.match(started.output, new RegExp(`ptbk ${OTHER_VERSION.replace(/\./g, '\\.')}`));

    const status = await ptbk(['status', '--json'], { cwd: project, env });
    assert.equal(status.code, 0, status.output);
    assert.equal(JSON.parse(status.stdout).engine.version, OTHER_VERSION, 'status shows the service through its own installation');

    const viewer = spawn(process.execPath, [BIN, 'dashboard', '--raw'], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    t.after(() => viewer.kill('SIGKILL'));
    let output = '';
    viewer.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    viewer.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    await waitFor(() => output.includes(`ptbk ${OTHER_VERSION}`) && output.includes('daemon for'), { message: 'the delegated dashboard' });
    assert.doesNotMatch(output, /Internal error|Cannot read properties/);
    viewer.kill('SIGKILL');

    const paused = await ptbk(['pause', '--raw'], { cwd: project, env });
    assert.equal(paused.code, 0, paused.output);
    assert.match(paused.stdout, new RegExp(`Engine: ptbk ${OTHER_VERSION.replace(/\./g, '\\.')}`), 'the result names the service version, not this client');
    assert.match(paused.stdout, /BLOCKED: Service runs ptbk/, 'live details that cannot be read are not guessed');
    assert.doesNotMatch(paused.output, /Internal error|Cannot read properties/);

    // The service's installation was upgraded in place: there is nothing left that can render it.
    await writeFile(join(other.root, 'package.json'), JSON.stringify({ name: 'ptbk', version: '0.0.1-upgraded' }));
    const orphan = await ptbk(['dashboard', '--raw'], { cwd: project, env });
    assert.notEqual(orphan.code, 0);
    assert.match(orphan.output, new RegExp(`uses ptbk ${OTHER_VERSION.replace(/\./g, '\\.')}; this ptbk .* cannot read its status`), orphan.output);
    assert.doesNotMatch(orphan.output, /Internal error/);

    const stopped = await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    assert.equal(stopped.code, 0, stopped.output);
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')), 'stopping works across versions');
});

test('configuration compatibility: an older engine refuses a newer configuration without writes; a newer one migrates it in one commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const before = (await git(project, ['log', '--format=%H'])).trim();
    const configBefore = await readFile(join(project, 'ptbk.json'), 'utf8');
    const older = await otherInstallation(t, '0.0.1-older');
    const refused = await runOther(older.bin, ['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.notEqual(refused.code, 0, 'an older engine does not start project work');
    assert.match(refused.output, new RegExp(`configured by ptbk ${ENGINE_VERSION.replace(/\./g, '\\.')}; the running ptbk 0\\.0\\.1-older is older`));
    assert.match(refused.output, /update ptbk/i, 'it offers the update instead of downgrading');
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), configBefore, 'no configuration write');
    assert.equal((await git(project, ['log', '--format=%H'])).trim(), before, 'no commit');

    const newer = await otherInstallation(t);
    const migrated = await runOther(newer.bin, ['tool', 'list', '--raw'], { cwd: project, env });
    assert.equal(migrated.code, 0, migrated.output);
    assert.equal(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).promptbookVersion, ENGINE_VERSION, 'read-only inspection never migrates');
    const tool = await runOther(newer.bin, ['tool', 'disable', 'openai-codex', '--yes', '--raw'], { cwd: project, env });
    assert.equal(tool.code, 0, tool.output);
    const history = (await git(project, ['log', '--format=%s'])).trim().split('\n');
    assert.equal(history[0], 'PTBK: Disable tool openai-codex', 'the tool change is its own commit');
    assert.equal(history[1], `PTBK: Migrate configuration from ${ENGINE_VERSION} to ${OTHER_VERSION}`, 'the migration pass is one dedicated commit before it');
    assert.equal(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).promptbookVersion, OTHER_VERSION);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});
