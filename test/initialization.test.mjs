import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { initializeProject } from '../dist/coder/authoring.js';
import { captureSnapshot, commitScoped, readHead } from '../dist/coder/git.js';
import { inspectInitializationDestination, prepareInitializationDestination, finalizeInitializationDestination, inspectLocalInstallation, installProjectEngine, inspectProjectReadiness, persistInitializationPending } from '../dist/coder/initialization.js';

/** Run fixture Git without interpolating paths in a shell. */
const execute = promisify(execFile);
/** Execute a Git command in one isolated fixture. */
async function git(root, args) { return (await execute('git', ['-C', root, ...args])).stdout; }
/** Create a temporary directory, optionally with an unborn Git repository. */
async function fixture(t, repository = true, prefix = 'ptbk initialization ') {
    const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
    t.after(() => rm(root, { recursive: true, force: true }));
    if (repository) {
        await git(root, ['init', '-q']);
        await git(root, ['config', 'user.name', 'Fixture']);
        await git(root, ['config', 'user.email', 'fixture@example.test']);
        await git(root, ['config', 'commit.gpgsign', 'false']);
    }
    return root;
}
/** Materialize the package and npm executable expected from an authorized install. */
async function localEngine(root, version = '1.2.3') {
    const directory = join(root, 'node_modules', 'ptbk');
    await mkdir(join(directory, 'bin'), { recursive: true });
    await mkdir(join(root, 'node_modules', '.bin'), { recursive: true });
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'ptbk', version, bin: { ptbk: 'bin/ptbk.js' } }));
    await writeFile(join(directory, 'bin', 'ptbk.js'), '#!/usr/bin/env node\n');
    await writeFile(join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'ptbk.cmd' : 'ptbk'), '#!/usr/bin/env node\n');
}

test('fresh default init provides a package, configuration and missing agents without a model call', async t => {
    const root = await fixture(t, false);
    const inspected = await inspectInitializationDestination(root);
    assert.equal(inspected.fresh, true);
    await prepareInitializationDestination({ destination: root });
    const workspace = await resolveWorkspace({ path: root }, true);
    const before = await captureSnapshot(root);
    const changed = await initializeProject(workspace);
    assert.ok(changed.includes(join(root, 'ptbk.json')));
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    assert.equal(manifest.dependencies?.ptbk, undefined);
    assert.match(manifest.scripts.check, /process\.exit\(1\)/);
    await git(root, ['config', 'user.name', 'Fixture']);
    await git(root, ['config', 'user.email', 'fixture@example.test']);
    await git(root, ['config', 'commit.gpgsign', 'false']);
    await commitScoped(before, 'Initialize project', { paths: changed.map(path => path.slice(root.length + 1)) });
    const head = await readHead(root);
    assert.ok(head);
    assert.deepEqual(await initializeProject(workspace), []);
    assert.equal(await commitScoped(await captureSnapshot(root), 'No changes'), undefined);
    assert.equal(await readHead(root), head);
    assert.deepEqual((await readdir(join(root, 'tasks'))).sort(), ['README.md', 'templates']);
});

test('initializing in place reuses an enclosing unborn repository and preserves unrelated staging', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'existing-project');
    await mkdir(child);
    await writeFile(join(parent, 'unrelated.txt'), 'Staged owner work\n');
    await git(parent, ['add', '--', 'unrelated.txt']);
    const index = await git(parent, ['ls-files', '--stage', '-z']);
    const prepared = await prepareInitializationDestination({ destination: child });
    assert.equal(prepared.nested, false);
    assert.equal((await resolveWorkspace({ path: child }, true)).gitRoot, parent);
    assert.equal(await git(parent, ['ls-files', '--stage', '-z']), index);
    assert.deepEqual(await readdir(child), []);
});

test('nested child decisions fail or go back before changing parent or child', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'child');
    const before = (await readdir(parent)).sort();
    await assert.rejects(prepareInitializationDestination({ destination: child, newProject: true }), /Choose --nested-strategy/);
    const back = await prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'back' });
    assert.equal(back.cancelled, true);
    assert.deepEqual((await readdir(parent)).sort(), before);
    await assert.rejects(prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'submodule' }), /requires --submodule-source/);
    assert.deepEqual((await readdir(parent)).sort(), before);
});

test('an explicitly new empty child inside Git is fresh while in-place setup reuses project purpose', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'empty-child');
    await mkdir(child);
    assert.equal((await inspectInitializationDestination(child)).fresh, false);
    const newChild = await inspectInitializationDestination(child, { newProject: true });
    assert.equal(newChild.fresh, true);
    assert.equal(newChild.nested, true);
    assert.deepEqual(await readdir(child), []);
});

test('invalid existing setup metadata fails before creating Git or bootstrap artifacts', async t => {
    const root = await fixture(t, false);
    const configuration = join(root, 'ptbk.json');
    await writeFile(configuration, '{invalid');
    await assert.rejects(prepareInitializationDestination({ destination: root }), /ptbk\.json/);
    await assert.rejects(initializeProject(await resolveWorkspace({ path: root }, true)), /ptbk\.json/);
    assert.deepEqual(await readdir(root), ['ptbk.json']);
    await rm(configuration);
    for (const content of ['{invalid', '{"scripts":"invalid"}', '{"scripts":{"check":false}}']) {
        await writeFile(join(root, 'package.json'), content);
        await assert.rejects(initializeProject(await resolveWorkspace({ path: root }, true)), /package\.json/);
        assert.deepEqual(await readdir(root), ['package.json']);
    }
});

test('ignored child boundary ignores the entire literal child and resumes without duplicate rules', async t => {
    const parent = await fixture(t);
    await writeFile(join(parent, 'unrelated.txt'), 'Owner content\n');
    await git(parent, ['add', '--', 'unrelated.txt']);
    const index = await git(parent, ['ls-files', '--stage', '-z']);
    const child = join(parent, 'child [draft]');
    const prepared = await prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'ignored' });
    assert.deepEqual(prepared.parentChanges, [join(parent, '.gitignore')]);
    assert.equal((await resolveWorkspace({ path: child }, true)).gitRoot, child);
    assert.equal(await git(parent, ['ls-files', '--stage', '-z']), index);
    const rule = await readFile(join(parent, '.gitignore'), 'utf8');
    assert.match(await git(parent, ['check-ignore', '--', 'child [draft]/some-code.txt']), /child \[draft\]/);
    const again = await prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'ignored' });
    assert.equal(again.resumable, true);
    assert.deepEqual(again.parentChanges, []);
    assert.equal(await readFile(join(parent, '.gitignore'), 'utf8'), rule);
    assert.equal(await readHead(parent), null);
});

test('machine-local exclusions do not replace the parent versioned child ignore rule', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'child');
    await writeFile(join(parent, '.git', 'info', 'exclude'), '/child/\n');
    const prepared = await prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'ignored' });
    assert.deepEqual(prepared.parentChanges, [join(parent, '.gitignore')]);
    assert.equal(await readFile(join(parent, '.gitignore'), 'utf8'), '/child/\n');
});

test('new child initialization refuses nonempty or tracked destinations without changing parent metadata', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'child');
    await mkdir(child);
    await writeFile(join(child, 'owned.txt'), 'Keep this');
    await git(parent, ['add', '--', 'child/owned.txt']);
    await assert.rejects(prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'ignored' }), /not empty/);
    assert.equal(await readFile(join(child, 'owned.txt'), 'utf8'), 'Keep this');
    assert.deepEqual((await readdir(parent)).sort(), ['.git', 'child']);
});

test('submodule registration keeps escaped source, child baseline and unrelated parent staging without committing parent', async t => {
    const parent = await fixture(t);
    // Windows separators already require Git config escaping; use a literal backslash on other platforms too.
    const source = await fixture(t, true, process.platform === 'win32' ? 'ptbk initialization ' : 'ptbk initialization \\source ');
    await writeFile(join(source, '.gitignore'), '.ptbk/\n');
    await writeFile(join(source, 'source.txt'), 'Initial source\n');
    await git(source, ['add', '--', '.gitignore', 'source.txt']);
    await git(source, ['commit', '-qm', 'Source baseline']);
    await writeFile(join(parent, 'owner.txt'), 'Owner baseline\n');
    await git(parent, ['add', '--', 'owner.txt']);
    await git(parent, ['commit', '-qm', 'Parent baseline']);
    const parentHead = await readHead(parent);
    await writeFile(join(parent, 'owner.txt'), 'Owner staged work\n');
    await git(parent, ['add', '--', 'owner.txt']);
    const ownerEntry = await git(parent, ['ls-files', '--stage', '-z', '--', 'owner.txt']);
    const child = join(parent, 'child');
    const prepared = await prepareInitializationDestination({ destination: child, newProject: true, nestedStrategy: 'submodule', submoduleSource: source });
    const childHead = await readHead(child);
    const changed = await finalizeInitializationDestination(prepared);
    assert.deepEqual(changed, [join(parent, '.gitmodules'), child]);
    assert.equal(await git(parent, ['config', '--file', '.gitmodules', '--null', '--get', 'submodule.child.url']), `${source}\0`);
    assert.equal(await git(parent, ['config', '--file', '.gitmodules', '--null', '--get', 'submodule.child.path']), 'child\0');
    assert.equal(await git(parent, ['ls-files', '--stage', '-z', '--', 'owner.txt']), ownerEntry);
    assert.equal(await readHead(parent), parentHead);
    assert.equal(await readHead(child), childHead);
    assert.match(await git(parent, ['ls-files', '--stage', '--', 'child']), /^160000 /);
    assert.match(await readFile(join(child, '.git'), 'utf8'), /^gitdir: /);
    assert.deepEqual(await finalizeInitializationDestination(prepared), []);
    assert.equal((await resolveWorkspace({ path: child }, true)).gitRoot, child);
});

test('destination installation does not inherit parent-local Promptbook and requires an explicit choice', async t => {
    const parent = await fixture(t);
    await writeFile(join(parent, 'package.json'), JSON.stringify({ dependencies: { ptbk: '1.2.3' } }));
    await localEngine(parent);
    const child = join(parent, 'child');
    await mkdir(child);
    const workspace = await resolveWorkspace({ path: child }, true);
    assert.deepEqual(await inspectLocalInstallation(child), { declared: false, usable: false });
    await assert.rejects(installProjectEngine(workspace), /Choose a destination installation/);
    assert.deepEqual(await readdir(child), []);
});

test('local installation saves the exact running version and preserves unrelated scripts and dependencies', async t => {
    const root = await fixture(t);
    const manifest = { scripts: { check: 'custom-check', start: 'node app.js' }, dependencies: { unrelated: '^4.0.0' } };
    await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
    const workspace = await resolveWorkspace({ path: root }, true);
    const calls = [];
    const run = async (command, args, options) => {
        calls.push({ command, args, cwd: options.cwd });
        await writeFile(join(root, 'package.json'), JSON.stringify({ ...manifest, dependencies: { ...manifest.dependencies, ptbk: '2.3.4-1' } }));
        await writeFile(join(root, 'package-lock.json'), '{"lockfileVersion":3}');
        await localEngine(root, '2.3.4-1');
        return { exitCode: 0, output: '' };
    };
    const result = await installProjectEngine(workspace, { choice: 'local', version: '2.3.4-1', run });
    assert.deepEqual(calls, [{ command: 'npm', args: ['install', '--prefix', root, '--workspaces=false', '--save-prod', '--save-exact', 'ptbk@2.3.4-1'], cwd: root }]);
    assert.deepEqual(result.changed, [join(root, 'package.json'), join(root, 'package-lock.json')]);
    const final = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    assert.deepEqual(final.scripts, manifest.scripts);
    assert.equal(final.dependencies.unrelated, '^4.0.0');
    assert.equal((await installProjectEngine(workspace, { choice: 'local', version: '2.3.4-1', run })).alreadyReady, true);
    assert.equal(calls.length, 1);
});

test('missing declared devDependency is repaired without replacing its version or moving its section', async t => {
    const root = await fixture(t);
    const manifest = { scripts: { check: 'custom' }, devDependencies: { ptbk: '^1.2.0', other: '^3.0.0' } };
    const original = JSON.stringify(manifest);
    await writeFile(join(root, 'package.json'), original);
    const workspace = await resolveWorkspace({ path: root }, true);
    const calls = [];
    const run = async (command, args) => {
        calls.push([command, args]);
        await localEngine(root, '1.2.3');
        return { exitCode: 0, output: '' };
    };
    const result = await installProjectEngine(workspace, { version: '9.9.9', run });
    assert.deepEqual(calls, [['npm', ['install', '--prefix', root, '--workspaces=false']]]);
    assert.equal(result.section, 'devDependencies');
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), original);
    assert.deepEqual(result.changed, []);
    assert.equal((await installProjectEngine(workspace, { run })).alreadyReady, true);
    assert.equal(calls.length, 1);
});

test('installation failure reports selected version without substituting latest', async t => {
    const root = await fixture(t);
    const workspace = await resolveWorkspace({ path: root }, true);
    const calls = [];
    await assert.rejects(installProjectEngine(workspace, { choice: 'local', version: '2.3.4-1', run: async (command, args) => { calls.push([command, args]); return { exitCode: 1, output: 'Version unavailable' }; } }), /2\.3\.4-1.*Version unavailable/);
    assert.equal(calls.length, 1);
    assert.match(calls[0][1].at(-1), /^ptbk@2\.3\.4-1$/);
});

test('project installation honors an existing package manager and lockfile', async t => {
    const root = await fixture(t);
    await writeFile(join(root, 'package.json'), '{"packageManager":"pnpm@10.0.0","dependencies":{}}');
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    const workspace = await resolveWorkspace({ path: root }, true);
    let invoked;
    await installProjectEngine(workspace, { choice: 'local', version: '1.2.3', run: async (command, args) => {
        invoked = [command, args];
        await writeFile(join(root, 'package.json'), '{"packageManager":"pnpm@10.0.0","dependencies":{"ptbk":"1.2.3"}}');
        await localEngine(root);
        return { exitCode: 0, output: '' };
    } });
    assert.deepEqual(invoked, ['pnpm', ['add', '--save-exact', 'ptbk@1.2.3']]);
    assert.ok(!(await readdir(root)).includes('package-lock.json'));
});

test('shared package manager workspaces fail before modifying enclosing metadata', async t => {
    const parent = await fixture(t);
    const child = join(parent, 'child');
    await mkdir(child);
    const parentLock = 'packages:\n  - child\n';
    await writeFile(join(parent, 'pnpm-workspace.yaml'), parentLock);
    await writeFile(join(child, 'package.json'), '{"packageManager":"pnpm@10.0.0"}');
    let called = false;
    await assert.rejects(installProjectEngine(await resolveWorkspace({ path: child }, true), { choice: 'local', version: '1.2.3', run: async () => { called = true; return { exitCode: 0, output: '' }; } }), /outside the selected project/);
    assert.equal(called, false);
    assert.equal(await readFile(join(parent, 'pnpm-workspace.yaml'), 'utf8'), parentLock);
    assert.deepEqual(await readdir(child), ['package.json']);
});

test('installation refuses an external node_modules symlink before invoking a package manager', async t => {
    const root = await fixture(t);
    const outside = await fixture(t, false);
    await symlink(outside, join(root, 'node_modules'));
    let invoked = false;
    await assert.rejects(installProjectEngine(await resolveWorkspace({ path: root }, true), { choice: 'local', version: '1.2.3', run: async () => { invoked = true; return { exitCode: 0, output: '' }; } }), /escapes/);
    assert.equal(invoked, false);
    assert.deepEqual(await readdir(outside), []);
});

test('shared readiness is read-only and reports missing artifacts separately from unresolved execution', async t => {
    const root = await fixture(t);
    const workspace = await resolveWorkspace({ path: root }, true);
    const before = (await readdir(root)).sort();
    const missing = await inspectProjectReadiness(workspace);
    assert.equal(missing.ready, false);
    assert.ok(missing.missing.includes('ptbk.json'));
    assert.ok(missing.missing.includes('core agent teacher'));
    assert.deepEqual((await readdir(root)).sort(), before);
    await initializeProject(workspace);
    const basic = await inspectProjectReadiness(workspace);
    assert.equal(basic.ready, true);
    assert.deepEqual(basic.missing, []);
    assert.match(basic.execution.join('\n'), /real project check command/);
    assert.match(basic.execution.join('\n'), /Commit the setup baseline/);
    const altered = 'Customized wrong name\n\nRULE Preserve this definition.\n';
    await writeFile(join(root, 'agents', '.core', 'adam.book'), altered);
    await assert.rejects(inspectProjectReadiness(workspace), /required core Book must be named adam/);
    assert.equal(await readFile(join(root, 'agents', '.core', 'adam.book'), 'utf8'), altered);
});

test('global use reports unavailable global CLI without installing or declaring a local dependency', async t => {
    const root = await fixture(t);
    const workspace = await resolveWorkspace({ path: root }, true);
    const calls = [];
    const outcome = await installProjectEngine(workspace, { choice: 'global', run: async (command, args) => {
        calls.push([command, args]);
        return { exitCode: 1, output: 'Global npm is unavailable' };
    } });
    assert.deepEqual(calls, [['npm', ['root', '--global']]]);
    assert.equal(outcome.alreadyReady, false);
    assert.match(outcome.unresolved.join('\n'), /Global ptbk is unavailable/);
    assert.deepEqual(outcome.changed, []);
    assert.deepEqual(await readdir(root), ['.git']);
});

test('pending generated edits remain visible until reviewed, without changing owner staging or read-only evidence', async t => {
    const root = await fixture(t);
    await writeFile(join(root, 'package.json'), '{"scripts":{"check":"custom-check"}}');
    await writeFile(join(root, '.gitignore'), '.ptbk/\n');
    await git(root, ['add', '--', 'package.json', '.gitignore']);
    await git(root, ['commit', '-qm', 'Project baseline']);
    const workspace = await resolveWorkspace({ path: root }, true);
    await writeFile(join(root, 'package.json'), '{"scripts":{"check":"custom-check","owner":"owner-staged-command"}}');
    await git(root, ['add', '--', 'package.json']);
    const staged = await git(root, ['ls-files', '--stage', '-z', '--', 'package.json']);
    await initializeProject(workspace);
    await persistInitializationPending(workspace, [join(root, 'package.json')]);
    const record = join(workspace.statePath, 'initialization-pending.json');
    const original = await readFile(record, 'utf8');
    assert.match((await inspectProjectReadiness(workspace)).execution.join('\n'), /Review and commit.*package\.json/);
    assert.equal(await readFile(record, 'utf8'), original);
    assert.equal(await git(root, ['ls-files', '--stage', '-z', '--', 'package.json']), staged);
    await persistInitializationPending(workspace, ['package.json']);
    assert.equal(await readFile(record, 'utf8'), original);
    await git(root, ['add', '--', 'package.json']);
    await git(root, ['commit', '-qm', 'Review pending setup']);
    assert.doesNotMatch((await inspectProjectReadiness(workspace)).execution.join('\n'), /Review and commit/);
    assert.equal(await readFile(record, 'utf8'), original);
    await persistInitializationPending(workspace, []);
    await assert.rejects(readFile(record), error => error.code === 'ENOENT');
});

test('pending initialization paths cannot escape the selected project', async t => {
    const root = await fixture(t);
    const outside = await fixture(t, false);
    const workspace = await resolveWorkspace({ path: root }, true);
    await assert.rejects(persistInitializationPending(workspace, [join(outside, 'package.json')]), /escapes/);
    assert.deepEqual(await readdir(root), ['.git']);
});
