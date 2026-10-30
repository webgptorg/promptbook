import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, copyFile, cp, mkdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { interpretConfig, parseConfigText, updatePolicyOf } from '../dist/project/config.js';
import { parseVersionRange, policyPermits, rangeAdmits, selectUpdate } from '../dist/project/update-policy.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { ROOT, fakeHarness, git, initRepository, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * The default policy (automatic updates on, no range).
 */
const DEFAULT = { isAutoUpdateEnabled: true };

/**
 * A realistic published history around the current release line.
 */
const PUBLISHED = ['0.118.0', '0.118.1', '0.119.0-38', '0.119.0-39', '0.119.0-40', '0.119.0-41', '0.119.0', '0.119.1', '0.120.0-0', '0.120.0-1', '0.120.0', '0.121.0-3', '1.0.0-0', '1.0.0', '1.1.0'];

test('update policy: stable installations take stable minor/patch within the major, never a prerelease or a major', () => {
    assert.equal(selectUpdate('0.119.0', PUBLISHED, DEFAULT).target, '0.120.0', '0.119.0 → 0.120.0 (minor in major zero, not the caret meaning)');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, DEFAULT).target, undefined, 'no prerelease 0.121.0-3 and no 1.0.0');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, DEFAULT).constraint, 'none');
    assert.equal(selectUpdate('1.0.0', PUBLISHED, DEFAULT).target, '1.1.0');
    assert.equal(selectUpdate('0.118.0', ['0.118.1', '0.118.10', '0.118.9'], DEFAULT).target, '0.118.10', 'numeric, not lexical, ordering');
});

test('update policy: a running prerelease advances on its line, prefers its stable release and never re-enters prereleases', () => {
    assert.equal(selectUpdate('0.119.0-39', ['0.119.0-40', '0.119.0-41'], DEFAULT).target, '0.119.0-41', 'newer prereleases of the same line');
    assert.equal(selectUpdate('0.119.0-39', PUBLISHED, DEFAULT).target, '0.119.0', 'the stable transition wins once published');
    assert.equal(selectUpdate('0.119.0-41', ['0.119.0-41', '0.120.0-0', '0.120.0-1'], DEFAULT).target, undefined, 'no crossing into another prerelease base');
    // After the stable transition the stable rules apply: the next prerelease line is not entered automatically.
    assert.equal(selectUpdate('0.119.0', ['0.119.1-0', '0.120.0-0'], DEFAULT).target, undefined);
    assert.equal(selectUpdate('0.119.0-9', ['0.119.0-10'], DEFAULT).target, '0.119.0-10', 'numeric prerelease ordering');
});

test('update policy: exact pins, explicit ranges, disabled updates and invalid ranges', () => {
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).target, undefined, 'an exact pin never moves away');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).constraint, 'pinned');
    assert.equal(selectUpdate('0.119.0-39', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0-39' }).target, undefined, 'including an exact prerelease pin');
    assert.equal(selectUpdate('0.118.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '=0.119.1' }).target, '0.119.1', 'a newer pin is reached');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).target, undefined, 'never downgraded to a pin');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '~0.119.0' }).target, '0.119.1', 'a narrower range is honored');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '>=0.119.0 <2' }).target, '1.1.0', 'an explicit range may allow a major upgrade');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '*' }).target, '1.1.0');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: false }).constraint, 'disabled');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: 'latest!' }).constraint, 'invalid');
    // A broad range does not opt a stable installation into prereleases.
    assert.equal(selectUpdate('0.120.0', ['0.121.0-3'], { isAutoUpdateEnabled: true, versionRange: '>=0.120.0' }).target, undefined);
});

test('update policy: npm-style ranges, evaluated against the candidate base release', () => {
    const admits = (range, version) => rangeAdmits(parseVersionRange(range), version);
    assert.ok(admits('^0.119.0', '0.119.5'));
    assert.ok(!admits('^0.119.0', '0.120.0'), 'the caret keeps its own zero-major meaning when written explicitly');
    assert.ok(admits('^1.2.3', '1.9.0'));
    assert.ok(!admits('^1.2.3', '2.0.0'));
    assert.ok(admits('~1.2', '1.2.9'));
    assert.ok(!admits('~1.2', '1.3.0'));
    assert.ok(admits('1.x', '1.4.0'));
    assert.ok(admits('1.2.3 - 1.4', '1.4.7'));
    assert.ok(!admits('1.2.3 - 1.4', '1.5.0'));
    assert.ok(admits('<0.119.0 || >=1.0.0', '1.0.0'));
    assert.ok(admits('>= 0.119.0', '0.119.0-40'), 'a prerelease is evaluated by its base 0.119.0');
    assert.ok(!admits('<0.119.0', '0.119.0-40'));
    assert.equal(parseVersionRange('0.119.0').exact, '0.119.0');
    assert.equal(parseVersionRange('^0.119.0').exact, undefined);
    for (const invalid of ['', 'latest', '>>1', '1.2.3.4', 'abc - 1']) assert.equal(parseVersionRange(invalid), undefined, invalid);
});

test('update policy: shared installations need every associated policy to permit the target', () => {
    assert.ok(policyPermits(DEFAULT, '0.119.0', '0.120.0'));
    assert.ok(!policyPermits({ isAutoUpdateEnabled: true, versionRange: '0.119.0' }, '0.119.0', '0.120.0'), 'one pin blocks the shared replacement');
    assert.ok(!policyPermits({ isAutoUpdateEnabled: false }, '0.119.0', '0.120.0'));
    assert.ok(!policyPermits(DEFAULT, '0.119.0', '1.0.0'));
});

test('update policy: saved in ptbk.json under updates, default on, explicit false and pins preserved', () => {
    const fresh = interpretConfig(parseConfigText('{}'));
    assert.deepEqual(updatePolicyOf(fresh), { isAutoUpdateEnabled: true });
    const saved = interpretConfig(parseConfigText(JSON.stringify({ updates: { isAutoUpdateEnabled: false, versionRange: '0.119.0' } })));
    assert.deepEqual(updatePolicyOf(saved), { isAutoUpdateEnabled: false, versionRange: '0.119.0' });
    assert.ok(!saved.diagnostics.some((diagnostic) => diagnostic.location.includes('updates')), 'updates is a known section');
    const wallet = interpretConfig(parseConfigText(JSON.stringify({ wallet: { isAuditCommitted: false } })));
    assert.ok(!wallet.diagnostics.some((diagnostic) => diagnostic.location.includes('wallet')), 'wallet is a known section too');
    const invalid = interpretConfig(parseConfigText(JSON.stringify({ updates: { versionRange: 'newest please' } })));
    assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.location === 'ptbk.json › updates.versionRange' && diagnostic.severity === 'error'));
});

/**
 * Version of the simulated local installation before the update.
 */
const FROM = '0.500.0-1';

/**
 * The release the default policy selects for {@link FROM}: its own stable release.
 */
const TARGET = '0.500.0';

/**
 * Runs a CLI (the copied local installation) and returns its exit code and output.
 */
function run(bin, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [bin, ...args], { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        let output = '';
        child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
        child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, output }));
    });
}

/**
 * A project whose `node_modules/ptbk` is a copy of the built engine at {@link FROM}, with a fake `npm` first on PATH.
 */
async function locallyInstalledProject(t, npm) {
    const beforeRemoval = [];
    const directory = await temporaryDirectory(t, 'ptbk self-update', beforeRemoval);
    const harness = await fakeHarness(t, directory);
    const project = join(directory, 'host project');
    await initRepository(project);
    const installation = join(project, 'node_modules', 'ptbk');
    await cp(join(ROOT, 'bin'), join(installation, 'bin'), { recursive: true });
    await cp(join(ROOT, 'dist'), join(installation, 'dist'), { recursive: true });
    const manifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
    await writeFile(join(installation, 'package.json'), JSON.stringify({ ...manifest, version: FROM }, null, 4));
    const modules = join(installation, 'node_modules');
    await symlink(join(ROOT, 'node_modules'), modules, 'junction');
    beforeRemoval.push(() => unlink(modules));
    await writeFile(join(project, 'package.json'), `${JSON.stringify({ name: 'host-project', private: true, dependencies: { ptbk: FROM } }, null, 2)}\n`);
    await writeFile(join(project, '.gitignore'), 'node_modules/\n');
    await writeFile(join(project, 'check.mjs'), 'process.exit(0);\n');
    await git(project, ['add', 'package.json', '.gitignore', 'check.mjs']);
    await git(project, ['commit', '--quiet', '-m', 'Host project with a local ptbk']);
    const tools = join(directory, 'fake npm');
    await mkdir(tools, { recursive: true });
    await copyFile(join(ROOT, 'test', 'fixtures', 'fake-npm.mjs'), join(tools, 'fake-npm.mjs'));
    await writeFile(join(tools, 'npm.json'), JSON.stringify(npm));
    await writeFile(join(tools, 'npm'), `#!/bin/sh\nexec "${process.execPath}" "${join(tools, 'fake-npm.mjs')}" "$@"\n`);
    await chmod(join(tools, 'npm'), 0o755);
    const pathKey = Object.keys(harness.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const env = { ...harness.env, [pathKey]: `${tools}${delimiter}${harness.env[pathKey]}` };
    const bin = join(installation, 'bin', 'ptbk.js');
    beforeRemoval.push(() => run(bin, ['stop', '--force', '--raw'], { cwd: project, env }));
    const init = await run(bin, ['init', '--path', project, '--non-interactive', '--harness', 'openai-codex', '--check', 'node check.mjs', '--no-start', '--raw'], { cwd: project, env });
    assert.ok([0, 3].includes(init.code), init.output);
    const configPath = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.discovery = { ...config.discovery, isEnabled: false };
    await writeFile(configPath, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'No goal discovery', '--', 'ptbk.json']);
    const npmLog = async () => (await readFile(join(tools, 'npm.log'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    const status = async () => JSON.parse((await run(bin, ['status', '--json'], { cwd: project, env })).output);
    const control = async (method, params = {}) => {
        const record = await readProcessRecord(projectAt(project));
        return await new ControlClient(projectAt(project), record).request(method, params, 60_000);
    };
    return { project, env, bin, npmLog, status, control };
}

test('engine self-update: a low-priority system task updates the local installation, keeps a pause accepted meanwhile and verifies the restart', { timeout: 240_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, npmLog, status, control } = await locallyInstalledProject(t, { versions: ['0.499.0', FROM, '0.500.0-2', TARGET, '0.500.1-0', '1.0.0'], installDelayMs: 2500 });
    assert.equal((await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).service?.state === 'running', { message: 'the engine to run' });
    assert.equal((await status()).update.installation.scope, 'local');

    // A manual pause holds the system task like any background work: the release is known but nothing is installed.
    assert.equal((await run(bin, ['pause', '--raw'], { cwd: project, env })).code, 0);
    const found = await control('update-check');
    assert.equal(found.target, TARGET, 'a running prerelease moves to its stable release, not to 0.500.1-0 or 1.0.0');
    const pending = await status();
    const system = pending.queue.find((item) => item.ref === 'system:engine-update');
    assert.equal(system?.kind, 'engine');
    assert.equal(system.source, '', 'no fictitious project Book');
    assert.match(system.executor, /engine/);
    const inventory = await control('task-inventory');
    assert.ok(inventory.some((item) => item.ref === 'system:engine-update' && item.kind === 'engine'), 'the same task inventory lists the system task');
    // The CLI lists and details the same system task: its definition, executor and no source.
    const listed = JSON.parse((await run(bin, ['list', '--json'], { cwd: project, env })).output);
    assert.ok(listed.systemTasks.some((item) => item.ref === 'system:engine-update'), 'ptbk list shows the pending update');
    const detail = JSON.parse((await run(bin, ['list', 'system:engine-update', '--json'], { cwd: project, env })).output);
    assert.equal(detail.kind, 'engine');
    assert.equal(detail.definition, 'Engine self-update', 'the run names its durable engine definition');
    assert.equal(detail.retry, undefined, 'a first attempt is not a retry');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.ok(!(await npmLog()).some((entry) => entry.args[0] === 'install'), 'paused: no installation');

    // Resumed with free hands the update installs; a pause accepted during the installation survives the restart.
    assert.equal((await run(bin, ['resume', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).update?.phase === 'installing', { message: 'the installation to start' });
    assert.equal((await run(bin, ['pause', '--raw'], { cwd: project, env })).code, 0);
    const updated = await waitFor(async () => {
        const snapshot = await status().catch(() => undefined);
        return snapshot?.engine?.version === TARGET && snapshot.update?.lastOutcome?.outcome === 'verified' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the restarted engine to load the update' });
    assert.equal(updated.service.state, 'pause', 'the pause accepted during maintenance is kept by the update restart');
    assert.equal(updated.update.lastOutcome.from, FROM);

    const install = (await npmLog()).filter((entry) => entry.args[0] === 'install');
    assert.equal(install.length, 1, 'one installation');
    assert.deepEqual(install[0].args, ['install', '--save-exact', '--save-prod', `ptbk@${TARGET}`], 'the dependency placement is kept');
    assert.equal(JSON.parse(await readFile(join(project, 'package.json'), 'utf8')).dependencies.ptbk, TARGET);
    const history = await subjects(project);
    assert.ok(history.includes(`ptbk: Update Promptbook engine ${FROM} → ${TARGET}`), history.join('\n'));
    const changed = (await git(project, ['show', '--name-only', '--format=', `HEAD~${history.indexOf(`ptbk: Update Promptbook engine ${FROM} → ${TARGET}`)}`])).trim().split('\n');
    assert.deepEqual(changed.sort(), ['package-lock.json', 'package.json'], 'a scoped system commit of the package files only');
    assert.equal(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).promptbookVersion, TARGET, 'the new engine migrated the configuration');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'nothing is left uncommitted');
    assert.ok(!(await status()).queue.some((item) => item.ref === 'system:engine-update'), 'nothing is pending anymore');
    const finished = (await control('task-inventory')).find((item) => item.ref === 'system:engine-update');
    assert.equal(finished?.readiness, 'done');
    assert.deepEqual(finished.runs.map((item) => [item.title, item.outcome]), [[`${FROM} → ${TARGET}`, 'completed']], 'the verified run is the system task evidence');
    const result = (await status()).results.recent.find((item) => item.ref === 'system:engine-update');
    assert.deepEqual([result?.kind, result?.outcome, result?.title], ['engine', 'completed', `Update Promptbook ${FROM} → ${TARGET}`], 'the run shares the results feed with ordinary task outcomes');
});

test('engine self-update: a release this Node.js cannot run is skipped before installation and an older compatible one is installed', { timeout: 240_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const compatible = '0.500.0-2';
    const { project, env, bin, npmLog, status, control } = await locallyInstalledProject(t, { versions: [FROM, compatible, TARGET], engines: { [TARGET]: { node: '>=999' } } });
    assert.equal((await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).service?.state === 'running', { message: 'the engine to run' });
    await control('update-check');
    const updated = await waitFor(async () => {
        const snapshot = await status().catch(() => undefined);
        return snapshot?.engine?.version === compatible && snapshot.update?.lastOutcome?.outcome === 'verified' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the restarted engine to load the compatible release' });
    const log = await npmLog();
    assert.ok(log.some((entry) => entry.args[0] === 'view' && entry.args[1] === `ptbk@${TARGET}` && entry.args[2] === 'engines'), 'the requirement was read before installation');
    assert.deepEqual(log.filter((entry) => entry.args[0] === 'install').map((entry) => entry.args.at(-1)), [`ptbk@${compatible}`], 'the incompatible release was never installed');
    assert.equal(updated.update.target, undefined, 'nothing else is pending');
    assert.match(updated.update.reason, /Skipped: ptbk 0\.500\.0 \(requires Node\.js >=999\)/, updated.update.reason);
});

test('engine self-update: a failed installation keeps the running version and schedules an automatic recheck', { timeout: 180_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, npmLog, status, control } = await locallyInstalledProject(t, { versions: [FROM, TARGET], failInstall: true });
    assert.equal((await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).service?.state === 'running', { message: 'the engine to run' });
    await control('update-check');
    const failed = await waitFor(async () => {
        const snapshot = await status();
        return snapshot.update?.lastOutcome?.outcome === 'failed' ? snapshot : undefined;
    }, { message: 'the failed update' });
    assert.equal(failed.engine.version, FROM);
    assert.equal(failed.service.state, 'running', 'a failed update neither stops nor pauses the engine');
    assert.equal(failed.update.phase, 'recovering');
    assert.ok(Date.parse(failed.update.nextAttemptAt) > Date.now() + 30 * 60_000, 'a cause-aware recheck, not a tight loop');
    assert.equal(failed.results.recent.find((item) => item.ref === 'system:engine-update')?.outcome, 'failed', 'the failed run is a result with its cause');
    assert.equal((await npmLog()).filter((entry) => entry.args[0] === 'install').length, 2, 'bounded technical attempts');
    assert.equal(JSON.parse(await readFile(join(project, 'node_modules', 'ptbk', 'package.json'), 'utf8')).version, FROM);
    assert.equal(failed.queue.find((item) => item.ref === 'system:engine-update')?.readiness, 'waiting-until');
    const retried = (await control('task-inventory')).find((item) => item.ref === 'system:engine-update');
    assert.equal(retried.retry, 1, 'the pending run is the first retry after one failed run');
    assert.equal(retried.runs[0].outcome, 'failed');
    assert.match(retried.runs[0].detail, /failed/);
    assert.ok(!(await subjects(project)).some((subject) => subject.includes('Update Promptbook engine')));

    // Turning automatic updates off is the shared policy operation with its own commit.
    const off = await control('update-policy', { isAutoUpdateEnabled: false });
    assert.equal(off.policy.isAutoUpdateEnabled, false);
    assert.equal(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).updates.isAutoUpdateEnabled, false);
    assert.ok((await subjects(project)).includes('ptbk: Turn automatic engine updates off'));
    assert.ok(!(await status()).queue.some((item) => item.ref === 'system:engine-update'), 'a disabled policy has no pending update');
});

test('engine self-update: a version that cannot start is replaced by the restored previous version and rechecked', { timeout: 180_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, npmLog, status, control } = await locallyInstalledProject(t, { versions: [FROM, TARGET], brokenVersions: [TARGET] });
    assert.equal((await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).service?.state === 'running', { message: 'the engine to run' });
    await control('update-check');
    const recovered = await waitFor(async () => {
        const snapshot = await status().catch(() => undefined);
        return snapshot?.engine?.version === FROM && snapshot.update?.lastOutcome?.outcome === 'failed' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the restored previous version to serve the project' });
    assert.equal(recovered.service.state, 'running', 'the restored engine keeps working; no unexpected-loss pause and no question');
    assert.ok(recovered.update.lastOutcome.detail.includes(`ptbk ${TARGET} exited with code 1 before it served the project; ptbk ${FROM} was restored`), recovered.update.lastOutcome.detail);
    assert.ok(Date.parse(recovered.update.nextAttemptAt) > Date.now() + 30 * 60_000, 'a cause-aware recheck, not an immediate reinstall');
    const installs = (await npmLog()).filter((entry) => entry.args[0] === 'install').map((entry) => entry.args.at(-1));
    assert.deepEqual(installs, [`ptbk@${TARGET}`, `ptbk@${FROM}`], 'the target, then the restored previous version');
    assert.equal(JSON.parse(await readFile(join(project, 'node_modules', 'ptbk', 'package.json'), 'utf8')).version, FROM);
    assert.equal(JSON.parse(await readFile(join(project, 'package.json'), 'utf8')).dependencies.ptbk, FROM);
    const history = await subjects(project);
    assert.ok(history.includes(`ptbk: Restore Promptbook engine ${FROM} after ${TARGET} failed to start`), history.join('\n'));
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'nothing is left uncommitted');
    const item = (await control('task-inventory')).find((entry) => entry.ref === 'system:engine-update');
    assert.equal(item?.retry, 1);
    assert.equal(item.runs[0].outcome, 'failed');
});

/**
 * A second project whose engine runs from the host project's installation (a stand-in for a shared global one), with
 * automatic updates and goal discovery off, started in the background.
 */
async function peerProject(host) {
    const peer = join(dirname(host.project), 'peer project');
    await initRepository(peer);
    await writeFile(join(peer, 'check.mjs'), 'process.exit(0);\n');
    await git(peer, ['add', 'check.mjs']);
    await git(peer, ['commit', '--quiet', '-m', 'Peer project']);
    const init = await run(join(ROOT, 'bin', 'ptbk.js'), ['init', '--path', peer, '--non-interactive', '--installation', 'global', '--harness', 'openai-codex', '--check', 'node check.mjs', '--no-start', '--raw'], { cwd: peer, env: host.env });
    assert.ok([0, 3].includes(init.code), init.output);
    const path = join(peer, 'ptbk.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(path, `${JSON.stringify({ ...config, discovery: { ...config.discovery, isEnabled: false }, updates: { isAutoUpdateEnabled: false } }, null, 4)}\n`);
    await git(peer, ['commit', '-q', '-m', 'Peer policy', '--', 'ptbk.json']);
    const stop = () => run(host.bin, ['stop', '--force', '--raw'], { cwd: peer, env: host.env });
    assert.equal((await run(host.bin, ['start', '--no-persist', '--raw'], { cwd: peer, env: host.env })).code, 0);
    const status = async () => JSON.parse((await run(host.bin, ['status', '--json'], { cwd: peer, env: host.env })).output);
    await waitFor(async () => (await status().catch(() => undefined))?.service?.state === 'running', { message: 'the peer engine to run' });
    return { peer, status, stop, instance: async () => (await readProcessRecord(projectAt(peer)))?.instanceId };
}

test('engine self-update: other engines of the installation restart only into a verified version', { timeout: 300_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const host = await locallyInstalledProject(t, { versions: [FROM, TARGET], brokenVersions: [TARGET] });
    assert.equal((await run(host.bin, ['start', '--no-persist', '--raw'], { cwd: host.project, env: host.env })).code, 0);
    await waitFor(async () => (await host.status()).service?.state === 'running', { message: 'the engine to run' });
    const peer = await peerProject(host);
    try {
        await sharedInstallationUpdates(host, peer);
    } finally {
        await peer.stop();
    }
});

/**
 * The shared-installation scenario: a broken release never reaches the peer; a verified one does, keeping its pause.
 */
async function sharedInstallationUpdates(host, peer) {
    const before = await peer.instance();

    // A release that cannot start is restored before any other engine is asked to load it.
    await host.control('update-check');
    await waitFor(async () => {
        const snapshot = await host.status().catch(() => undefined);
        return snapshot?.engine?.version === FROM && snapshot.update?.lastOutcome?.outcome === 'failed' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the restored previous version' });
    const untouched = await peer.status();
    assert.equal(untouched.service.state, 'running', 'the other project keeps working, neither stopped nor paused');
    assert.equal(untouched.engine.version, FROM);
    assert.equal(await peer.instance(), before, 'the other engine was never restarted into the broken release');

    // A release that starts and serves its project is then loaded by the other engine too, keeping its pause.
    await writeFile(join(dirname(host.project), 'fake npm', 'npm.json'), JSON.stringify({ versions: [FROM, TARGET] }));
    assert.equal((await run(host.bin, ['pause', '--raw'], { cwd: peer.peer, env: host.env })).code, 0);
    await writeFile(join(host.project, '.ptbk', 'state', 'engine-update.json'), JSON.stringify({ version: 1 }));
    assert.equal((await run(host.bin, ['restart', '--raw'], { cwd: host.project, env: host.env })).code, 0);
    await waitFor(async () => (await host.status().catch(() => undefined))?.service?.state === 'running', { timeoutMs: 60_000, message: 'the restarted engine' });
    await host.control('update-check');
    const restarted = await waitFor(async () => {
        const snapshot = await peer.status().catch(() => undefined);
        // A stopped service reports the CLI's version: only a live engine proves what it loaded.
        return snapshot?.engine?.version === TARGET && snapshot.service?.state !== 'stopped' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the other engine to load the verified version' });
    assert.equal((await host.status()).update.lastOutcome.outcome, 'verified');
    assert.equal(restarted.service.state, 'pause', 'its manual pause is kept');
}

/**
 * Saves a configuration as a newer engine would have left it (committed, like a pulled change).
 */
async function configuredByNewerEngine(project, changes = {}) {
    const path = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(path, `${JSON.stringify({ ...config, promptbookVersion: TARGET, ...changes }, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Configuration of a newer engine', '--', 'ptbk.json']);
}

test('compatibility gate: an update the saved policy allows needs no confirmation; a disabled policy is reported, never overridden', { timeout: 180_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, npmLog } = await locallyInstalledProject(t, { versions: [FROM, TARGET, '0.500.1-0', '1.0.0'] });
    await configuredByNewerEngine(project, { updates: { isAutoUpdateEnabled: false } });
    const refused = await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.notEqual(refused.code, 0);
    assert.match(refused.output, /configured by ptbk 0\.500\.0; the running ptbk 0\.500\.0-1 is older/);
    assert.match(refused.output, /Automatic updates are off/, refused.output);
    assert.ok(!(await npmLog()).some((entry) => entry.args[0] === 'install'), 'a disabled policy is never overridden unattended');

    await configuredByNewerEngine(project, { updates: { isAutoUpdateEnabled: true } });
    const updated = await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.notEqual(updated.code, 0, 'the loaded code never pretends to have changed: the invocation ends');
    assert.match(updated.output, /Updated this local ptbk installation to 0\.500\.0/, updated.output);
    assert.match(updated.output, /Run the same command again/);
    assert.deepEqual((await npmLog()).filter((entry) => entry.args[0] === 'install').map((entry) => entry.args.at(-1)), [`ptbk@${TARGET}`]);
    const rerun = await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(rerun.code, 0, rerun.output);
    const snapshot = JSON.parse((await run(bin, ['status', '--json'], { cwd: project, env })).output);
    assert.equal(snapshot.engine.version, TARGET);
});

test('compatibility gate: a required release this Node.js cannot run is reported as the real constraint and never installed', { timeout: 120_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, npmLog } = await locallyInstalledProject(t, { versions: [FROM, TARGET], engines: { [TARGET]: { node: '>=999' } } });
    await configuredByNewerEngine(project);
    const refused = await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.notEqual(refused.code, 0);
    assert.match(refused.output, /ptbk 0\.500\.0 requires Node\.js >=999/, refused.output);
    assert.match(refused.output, /Upgrade Node\.js/);
    assert.ok(!(await npmLog()).some((entry) => entry.args[0] === 'install'), 'nothing was installed');
});

test('compatibility gate: a running engine that finds a newer configuration updates itself under its policy and restarts', { timeout: 180_000 }, async (t) => {
    if (process.platform === 'win32') return t.skip('the fake npm is a POSIX shell wrapper');
    const { project, env, bin, status } = await locallyInstalledProject(t, { versions: [FROM, TARGET] });
    assert.equal((await run(bin, ['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status()).service?.state === 'running', { message: 'the engine to run' });
    await configuredByNewerEngine(project);
    const updated = await waitFor(async () => {
        const snapshot = await status().catch(() => undefined);
        return snapshot?.engine?.version === TARGET && snapshot.update?.lastOutcome?.outcome === 'verified' ? snapshot : undefined;
    }, { timeoutMs: 120_000, message: 'the engine to update itself to the configuration’s version' });
    assert.equal(updated.service.state, 'running');
    assert.ok(!updated.blockers.some((blocker) => blocker.kind === 'configuration'), 'the configuration is compatible again');
});
