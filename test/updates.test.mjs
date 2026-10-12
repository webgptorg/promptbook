import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { newerEngineVersion, checkEngineUpdate, inspectEngineInstallation, updateEngineInstallation } from '../dist/coder/updates.js';

/** Successful metadata processes never imply that a package mutation was verified. */
const success = output => ({ exitCode: 0, signal: null, cancelled: false, output });

/** Build independent source/destination installations, with no registry or machine changes. */
async function fixture(t, development = true) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk engine update ')));
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = join(root, 'origin'); const packagePath = join(project, 'node_modules', 'ptbk');
    const destination = join(root, 'destination');
    await mkdir(packagePath, { recursive: true }); await mkdir(destination);
    await writeFile(join(project, 'package.json'), JSON.stringify({ [development ? 'devDependencies' : 'dependencies']: { ptbk: '1.2.3' } }));
    await writeFile(join(packagePath, 'package.json'), '{"name":"ptbk","version":"1.2.3"}');
    return { root, project, packagePath, destination };
}

test('release comparison uses semantic ordering including prereleases', () => {
    assert.equal(newerEngineVersion('1.10.0', '1.9.0'), true);
    assert.equal(newerEngineVersion('1.2.3', '1.2.3-10'), true);
    assert.equal(newerEngineVersion('1.2.3-10', '1.2.3-9'), true);
    assert.equal(newerEngineVersion('1.2.3-beta.1', '1.2.3'), false);
    assert.equal(newerEngineVersion('1.2.3', '1.2.3'), false);
    assert.equal(newerEngineVersion('untrusted-version', '1.2.3'), false);
});

test('offline or unavailable release information is unknown and leaves setup possible', async () => {
    const offline = await checkEngineUpdate('1.2.3', { fetch: async () => { throw new Error('offline fixture'); } });
    assert.equal(offline.available, false); assert.equal(offline.latest, undefined);
    assert.match(offline.diagnostic, /currency is unknown/);
    const next = await checkEngineUpdate('1.2.3', { fetch: async (url, options) => {
        assert.equal(String(url), 'https://registry.npmjs.org/ptbk/latest');
        assert(options.signal instanceof AbortSignal);
        return new Response('{"version":"1.3.0"}', { status: 200 });
    } });
    assert.deepEqual(next, { current: '1.2.3', latest: '1.3.0', available: true });
});

test('self-update identifies the originating local dependency and preserves its section', async t => {
    for (const development of [true, false]) {
        const f = await fixture(t, development);
        const installation = await inspectEngineInstallation({ packagePath: f.packagePath, run: async () => success(join(f.root, 'global', 'node_modules')) });
        assert.equal(installation.scope, 'local'); assert.equal(installation.projectPath, f.project);
        assert.equal(installation.development, development);
        await updateEngineInstallation(installation, '1.3.0', { run: async (command, args, options) => {
            assert.equal(command, 'npm'); assert.equal(options.cwd, f.project);
            assert.deepEqual(args, ['install', '--prefix', f.project, '--workspaces=false', development ? '--save-dev' : '--save-prod', '--save-exact', 'ptbk@1.3.0']);
            await writeFile(join(f.packagePath, 'package.json'), '{"version":"1.3.0"}');
            return success('updated');
        } });
        assert.equal(JSON.parse(await readFile(join(f.packagePath, 'package.json'))).version, '1.3.0');
        assert.deepEqual(await readdir(f.destination), []);
    }
});

test('global self-update modifies only the running global installation', async t => {
    const f = await fixture(t);
    const globalRoot = join(f.root, 'global', 'node_modules');
    const globalPackage = join(globalRoot, 'ptbk');
    await mkdir(globalPackage, { recursive: true });
    await writeFile(join(globalPackage, 'package.json'), '{"version":"1.2.3"}');
    const installation = await inspectEngineInstallation({ packagePath: globalPackage, run: async () => success(globalRoot) });
    assert.equal(installation.scope, 'global');
    await updateEngineInstallation(installation, '1.3.0', { run: async (command, args) => {
        assert.deepEqual(args, ['install', '--global', 'ptbk@1.3.0']);
        await writeFile(join(globalPackage, 'package.json'), '{"version":"1.3.0"}');
        return success('updated');
    } });
    assert.equal(JSON.parse(await readFile(join(f.packagePath, 'package.json'))).version, '1.2.3');
    assert.deepEqual(await readdir(f.destination), []);
});

test('command launch or a development checkout cannot masquerade as a successful update', async t => {
    const f = await fixture(t);
    const installation = await inspectEngineInstallation({ packagePath: f.packagePath, run: async () => success(join(f.root, 'global')) });
    await assert.rejects(updateEngineInstallation(installation, '1.3.0', { run: async () => success('launched') }), /contains 1.2.3, expected 1.3.0/);
    const checkout = join(f.root, 'checkout'); await mkdir(checkout);
    await writeFile(join(checkout, 'package.json'), '{"version":"1.2.3"}');
    const unsupported = await inspectEngineInstallation({ packagePath: checkout, run: async () => success(join(f.root, 'global')) });
    assert.equal(unsupported.scope, 'unsupported');
    await assert.rejects(updateEngineInstallation(unsupported, '1.3.0', { run: async () => { throw new Error('must not run'); } }), /development checkout/);
    assert.deepEqual(await readdir(f.destination), []);
});

test('an already running Expert keeps its invoked engine identity after installation metadata changes', async t => {
    const f = await fixture(t);
    const coder = join(f.packagePath, 'dist', 'coder'); await mkdir(coder, { recursive: true });
    await writeFile(join(f.packagePath, 'dist', 'package.json'), '{"type":"module"}');
    for (const name of ['agents.js', 'version.js']) await copyFile(new URL(`../dist/coder/${name}`, import.meta.url), join(coder, name));
    const { pathToFileURL } = await import('node:url');
    const { installedEngineVersion } = await import(pathToFileURL(join(coder, 'version.js')).href);
    const { prepareAgent } = await import(pathToFileURL(join(coder, 'agents.js')).href);
    assert.equal(await installedEngineVersion(), '1.2.3');
    await writeFile(join(f.packagePath, 'package.json'), '{"version":"1.3.0"}');
    const expert = await prepareAgent('ptbk:expert', f.destination);
    assert.match(expert.instructions, /running ptbk 1\.2\.3 engine/);
    assert.doesNotMatch(expert.instructions, /running ptbk 1\.3\.0 engine/);
});
