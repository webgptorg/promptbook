import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { detectInstallation, ENGINE_VERSION } from '../dist/common/version.js';
import { EngineUpdater } from '../dist/engine/engine-update.js';
import { checkForEngineUpdate, installEngineVersion } from '../dist/project/self-update.js';
import { selectUpdate } from '../dist/project/update-policy.js';
import { projectAt } from '../dist/project/workspace.js';
import { DesktopUpdates } from '../apps/desktop/updates.cjs';
import { ROOT, temporaryDirectory } from './helpers.mjs';

/** GitHub fixture with the real installer naming contract; supplied URLs are deliberately untrusted. */
function release(version, { mac = 'arm64', windows = true, draft = false, unsigned = false } = {}) {
    return { tag_name: `v${version}`, draft, prerelease: version.includes('-'), assets: [
        ...(windows ? [{ name: `Promptbook-Setup-${version}-windows-x64.exe`, state: 'uploaded', size: 100, browser_download_url: 'https://example.test/evil.exe' }] : []),
        ...(mac ? [{ name: `Promptbook-${version}-macos-${mac}${unsigned ? '-unsigned' : ''}.dmg`, state: 'uploaded', size: 100 }] : []),
    ] };
}

/** Deterministic desktop discovery, exercising the shared engine policy without Electron. */
function desktop(current, releases, options = {}) {
    return new DesktopUpdates({ current, platform: 'win32', arch: 'x64', selectUpdate,
        fetch: async () => ({ ok: true, json: async () => releases }), ...options });
}

test('desktop discovery: stable ignores latest prereleases and draft releases; version order is semantic', async () => {
    const updates = desktop('0.119.0', [release('0.121.0-999'), release('0.120.0'), release('0.122.0', { draft: true }), release('1.0.0')]);
    const view = await updates.check();
    assert.equal(view.channel, 'stable');
    assert.equal(view.available.version, '0.120.0');
    assert.equal(view.available.url, 'https://github.com/webgptorg/promptbook/releases/download/v0.120.0/Promptbook-Setup-0.120.0-windows-x64.exe');
    assert.equal((await desktop('0.119.0', [release('0.120.0-1')]).check()).status, 'current');
    assert.equal((await desktop('0.119.0', [{ ...release('0.120.0'), prerelease: true }]).check()).status, 'current');
});

test('desktop discovery: preview follows later prerelease bases, stable transition and numeric ordering', async () => {
    const releases = [release('0.119.0-9'), release('0.119.0-10'), release('0.120.0-2')];
    assert.equal((await desktop('0.119.0-8', releases).check()).available.version, '0.120.0-2');
    assert.equal((await desktop('0.119.0-8', releases.slice(0, 2)).check()).available.version, '0.119.0-10');
    assert.equal((await desktop('0.119.0-8', [...releases, release('0.119.0')]).check()).available.version, '0.119.0');
    assert.equal((await desktop('0.119.0', releases).check()).available, undefined);
});

test('desktop discovery: requires an uploaded installer for the actual platform and architecture', async () => {
    const empty = { ...release('0.120.0'), assets: [] };
    assert.equal((await desktop('0.119.0', [empty, release('0.120.1', { windows: false })]).check()).status, 'current');
    const releases = [release('0.120.0', { mac: 'x64' }), release('0.121.0', { mac: 'arm64' })];
    assert.equal((await desktop('0.119.0', releases, { platform: 'darwin', arch: 'x64' }).check()).available.version, '0.120.0');
    const unsigned = await desktop('0.119.0-1', [release('0.120.0-1', { unsigned: true })], { platform: 'darwin', arch: 'arm64' }).check();
    assert.equal(unsigned.available.unsigned, true);
    assert.match(unsigned.available.url, /arm64-unsigned\.dmg$/);
    const unfinished = release('0.120.0');
    unfinished.assets.forEach((asset) => { asset.state = 'open'; });
    assert.equal((await desktop('0.119.0', [unfinished]).check()).status, 'current');
});

test('desktop discovery: pagination includes an older stable entry; failed or incomplete feeds stay unknown', async () => {
    const first = Array.from({ length: 100 }, (_, n) => release(`0.121.0-${n}`));
    let calls = 0;
    const updates = desktop('0.119.0', [], { fetch: async () => ({ ok: true, json: async () => ++calls === 1 ? first : [release('0.120.0')] }) });
    assert.equal((await updates.check()).available.version, '0.120.0');
    assert.equal(calls, 2);
    updates.fetch = async () => ({ ok: false, status: 403 });
    const offline = await updates.check();
    assert.equal(offline.status, 'unknown');
    assert.match(offline.problem, /403/);
    assert.equal(offline.available.version, '0.120.0', 'a previously checked offer survives a failed recheck');
    assert.equal((await desktop('0.119.0', first).check()).status, 'unknown');
    assert.equal((await desktop('0.119.0', [], { fetch: async () => { throw new Error('offline'); } }).check()).status, 'unknown');
});

test('desktop discovery: simultaneous checks use one request and broadcast one completed result', async () => {
    let calls = 0;
    const states = [];
    const updates = desktop('0.119.0', [], { changed: (state) => states.push(state.status), fetch: async () => { calls++; return { ok: true, json: async () => [release('0.120.0')] }; } });
    await Promise.all([updates.check(), updates.check(), updates.check()]);
    assert.equal(calls, 1);
    assert.deepEqual(states, ['checking', 'available']);
});

test('distribution identity: shell prefix is global; app bundle cannot be overwritten by npm', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk distribution');
    const prefix = join(directory, 'custom prefix');
    const root = join(prefix, 'lib', 'node_modules', 'ptbk');
    await mkdir(root, { recursive: true });
    await writeFile(join(prefix, 'ptbk-installation.json'), JSON.stringify({ method: 'shell', root: 'lib/node_modules/ptbk' }));
    assert.equal(detectInstallation(root).scope, 'global');
    const runtime = join(directory, 'Promptbook.app', 'Contents', 'Resources', 'runtime');
    const bundled = join(runtime, 'ptbk');
    await mkdir(bundled, { recursive: true });
    await writeFile(join(runtime, 'ptbk-installation.json'), JSON.stringify({ method: 'desktop-bundle', root: 'ptbk' }));
    const installation = detectInstallation(bundled);
    assert.equal(installation.scope, 'bundled');
    await assert.rejects(installEngineVersion(installation, '0.120.0'), /cannot be updated/);
    assert.equal(detectInstallation(join(directory, 'source')).scope, 'development');
    assert.equal(detectInstallation(join(directory, '_npx', 'cache', 'node_modules', 'ptbk')).scope, 'npx');
    assert.equal(detectInstallation(join(directory, 'project', 'node_modules', 'ptbk')).scope, 'local');
});

test('engine discovery: disabled automation and bundled installs still check and offer without scheduling installation', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk notification');
    for (const [scope, enabled] of [['local', false], ['bundled', true], ['development', true], ['npx', true]]) {
        const project = projectAt(join(directory, scope));
        await mkdir(project.runtime.state, { recursive: true });
        // Include an ineligible newest prerelease, as npm latest currently can point at one.
        await writeFile(join(project.runtime.state, 'engine-update.json'), JSON.stringify({ version: 1, checkedAt: new Date().toISOString(), published: ['0.120.0', '0.121.0-99'], latest: '0.121.0-99' }));
        const updater = new EngineUpdater({ project, env: {}, mode: 'daemon', version: '0.119.0', installation: { root: directory, version: '0.119.0', scope }, policy: () => ({ isAutoUpdateEnabled: enabled, source: 'ptbk.json' }), log() {}, changed() {}, commit: async () => undefined });
        await updater.load();
        assert.equal(updater.view().available, '0.120.0');
        assert.equal(updater.view().latest, '0.120.0', 'legacy raw latest never advertises an ineligible prerelease');
        assert.ok(updater.nextLookupAt(), 'notification-only installations keep checking');
        assert.equal(updater.view().target, undefined);
        assert.equal(updater.isDue, false);
        assert.equal(updater.inventoryItem(), undefined, 'a notification is not an installation task');
    }
});

test('initial check: npm version history, channel selection and disabled-policy lookup use the same registry path', async (t) => {
    if (process.platform === 'win32') return t.skip('fake npm uses a POSIX wrapper');
    const directory = await temporaryDirectory(t, 'ptbk registry notification');
    const tools = join(directory, 'tools');
    await mkdir(tools);
    await copyFile(join(ROOT, 'test/fixtures/fake-npm.mjs'), join(tools, 'fake-npm.mjs'));
    await writeFile(join(tools, 'npm.json'), JSON.stringify({ versions: [ENGINE_VERSION, '0.999.0-9', '0.999.0-10'] }));
    await writeFile(join(tools, 'npm'), `#!/bin/sh\nexec "${process.execPath}" "${join(tools, 'fake-npm.mjs')}" "$@"\n`);
    await chmod(join(tools, 'npm'), 0o755);
    const env = { ...process.env, PATH: `${tools}${delimiter}${process.env.PATH}` };
    const check = await checkForEngineUpdate(6000, env);
    assert.equal(check.latest, selectUpdate(ENGINE_VERSION, ['0.999.0-9', '0.999.0-10'], { isAutoUpdateEnabled: true }).target ?? ENGINE_VERSION);
    const project = projectAt(join(directory, 'project'));
    await mkdir(project.runtime.state, { recursive: true });
    const updater = new EngineUpdater({ project, env, mode: 'daemon', version: '0.999.0-8', installation: { root: directory, version: '0.999.0-8', scope: 'local', ownerProject: directory }, policy: () => ({ isAutoUpdateEnabled: false, source: 'ptbk.json' }), log() {}, changed() {}, commit: async () => undefined });
    await updater.lookupIfDue(true);
    assert.equal(updater.view().available, '0.999.0-10');
    assert.equal(updater.isDue, false);
    const log = (await readFile(join(tools, 'npm.log'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(log.some((entry) => entry.args.join(' ') === 'view ptbk versions --json'));
    assert.ok(log.every((entry) => entry.args[0] === 'view'), 'checks never install anything');
});
