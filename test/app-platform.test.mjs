import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { EngineApiState } from '../dist/app/api/state.js';
import { CONFORMANCE_BUILD } from '../dist/app/build.js';
import { engineHomePage } from '../dist/app/web/documents.js';
import { CONFORMANCE_TRUST_FILE_ENV, UiLoader, isEngineOwnedPath, uiUpdatePolicy } from '../dist/app/web/ui-loader.js';
import { ENGINE_VERSION } from '../dist/common/version.js';
import { protocol, releaseTools } from '../dist/vendor/app-platform.js';
import { temporaryDirectory } from './helpers.mjs';

const POSIX = process.platform !== 'win32';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const ENGINE = 'https://engine.localhost';

/** A request on the engine origin as a browser sends it. */
function request(path, { method = 'GET', accept = '*/*' } = {}) {
    return new Request(`${ENGINE}${path}`, { method, headers: { accept } });
}

/**
 * Writes an installed bundle and the loader state naming it as active, the way the loader leaves a verified install
 * (minus the read-only modes, so the test directory can be removed).
 */
async function installedBundle(directory, files) {
    const ui = join(directory, 'ui');
    await mkdir(ui, { recursive: true, mode: 0o700 });
    const name = `1.0.1-${'0123456789ab'}`;
    const manifestFiles = [];
    for (const [path, content] of Object.entries(files)) {
        const target = join(ui, name, path);
        await mkdir(join(target, '..'), { recursive: true, mode: 0o700 });
        await writeFile(target, content, { mode: 0o600 });
        manifestFiles.push({ path, size: Buffer.byteLength(content), sha256: sha256(content) });
    }
    const active = { version: '1.0.1', sha256: 'f'.repeat(64), logIndex: 42, directory: name, manifest: { version: '1.0.1', commit: 'a'.repeat(40), engineApi: '^1.0.0', entry: 'index.html', files: manifestFiles } };
    await writeFile(join(ui, 'state.json'), JSON.stringify({ v: 1, active, firstSeen: {} }), { mode: 0o600 });
    const policyPath = join(directory, 'policy.json');
    await writeFile(policyPath, JSON.stringify(trustPolicy()));
    return { name, path: join(ui, name), active, env: { PTBK_UI_TRUST_POLICY_FILE: policyPath } };
}

test('release build: the conformance build switch is off and a conformance trust file is refused by name', async (t) => {
    // The engine's release gate: only `npm run build:conformance` flips this constant, in a separate output folder.
    assert.equal(CONFORMANCE_BUILD, false);
    const directory = await temporaryDirectory(t, 'ptbk ui gate');
    await assert.rejects(UiLoader.create({ directory, env: { [CONFORMANCE_TRUST_FILE_ENV]: join(directory, 'trust.json') } }), (error) => {
        assert.match(error.message, /PTBK_CONFORMANCE_TRUST_FILE/);
        assert.match(error.message, /release build/);
        return true;
    });
});

test('UI loader settings: update policy and release store URL', async (t) => {
    assert.deepEqual(uiUpdatePolicy({}), { kind: 'auto' });
    assert.deepEqual(uiUpdatePolicy({ PTBK_UPDATE_POLICY: 'manual' }), { kind: 'manual' });
    assert.deepEqual(uiUpdatePolicy({ PTBK_UPDATE_POLICY: 'pinned', PTBK_PINNED_VERSION: '1.4.0' }), { kind: 'pinned', version: '1.4.0' });
    assert.throws(() => uiUpdatePolicy({ PTBK_UPDATE_POLICY: 'pinned' }), /PTBK_PINNED_VERSION/);
    assert.throws(() => uiUpdatePolicy({ PTBK_UPDATE_POLICY: 'pinned', PTBK_PINNED_VERSION: 'latest' }), /PTBK_PINNED_VERSION/);
    assert.throws(() => uiUpdatePolicy({ PTBK_UPDATE_POLICY: 'sometimes' }), /auto, manual or pinned/);
    const directory = await temporaryDirectory(t, 'ptbk ui settings');
    for (const url of ['http://store.localhost/', 'https://store.localhost/ui', 'https://user@store.localhost/', 'https://store.localhost/?a=1', 'not a url']) {
        await assert.rejects(UiLoader.create({ directory, env: { PTBK_UI_RELEASE_URL: url } }), /PTBK_UI_RELEASE_URL/, url);
    }
    await UiLoader.create({ directory, env: { PTBK_UI_RELEASE_URL: 'https://store.localhost/releases/' } });
});

/** A policy with distinct public keys, using the platform's production release delays. */
function trustPolicy(staging = false) {
    const key = (value) => ({ publicKey: Buffer.alloc(32, value).toString('base64url') });
    return {
        releaseKeys: [key(1)], maintainerKeys: [key(2), key(3), key(4)], securityThreshold: 2,
        workflowIdentity: { issuer: 'https://token.actions.githubusercontent.com', repository: 'webgptorg/app', repositoryId: '1411959168', workflowPath: '.github/workflows/ui-release.yml' },
        revocationRule: { signers: 'release-or-maintainer', threshold: 1 },
        delays: staging ? { regularMs: 300_000, securityMs: 300_000 } : { regularMs: 259_200_000, securityMs: 86_400_000 },
        ...(staging ? { profile: 'staging' } : {}),
    };
}

test('UI trust policy: release builds read a strict local policy once, using the pinned Sigstore root', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk release trust');
    const path = join(directory, 'policy.json');
    const policy = trustPolicy();
    await writeFile(path, JSON.stringify(policy));
    const loader = await UiLoader.create({ directory, env: { PTBK_UI_TRUST_POLICY_FILE: path, NODE_ENV: 'production', PTBK_UI_RELEASE_URL: 'https://store.localhost/' } });
    assert.deepEqual(loader.options.trust.policy, protocol.TrustPolicy.parse(policy));
    assert.ok(releaseTools.PINNED_TRUSTED_ROOT);
    await writeFile(path, 'changed after startup');
    assert.deepEqual(loader.options.trust.policy, policy, 'changing the file cannot replace the running policy');
    const staging = trustPolicy(true);
    await writeFile(path, JSON.stringify(staging));
    await assert.rejects(UiLoader.create({ directory, env: { PTBK_UI_TRUST_POLICY_FILE: path, NODE_ENV: 'production' } }), (error) => {
        assert.equal(error.message, `PTBK_UI_TRUST_POLICY_FILE: ${path} is a staging trust policy, which must not be used in production`);
        return true;
    });
    const development = await UiLoader.create({ directory, env: { PTBK_UI_TRUST_POLICY_FILE: path, NODE_ENV: 'development' } });
    assert.deepEqual(development.options.trust.policy, staging);
});

test('UI trust policy: invalid input refuses startup without disclosing the file contents', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk invalid trust');
    const path = join(directory, 'policy.json');
    const marker = 'PRIVATE_FILE_CONTENT_MARKER';
    const env = { PTBK_UI_TRUST_POLICY_FILE: path };
    const rejects = async (value = env) => assert.rejects(UiLoader.create({ directory, env: value }), (error) => {
        assert.match(error.message, /PTBK_UI_TRUST_POLICY_FILE/);
        assert.ok(error.message.includes(value.PTBK_UI_TRUST_POLICY_FILE));
        assert.ok(!error.message.includes(marker));
        return true;
    });
    await rejects(); // unreadable
    await rejects({ PTBK_UI_TRUST_POLICY_FILE: 'relative.json' });
    for (const content of [marker, JSON.stringify({ ...trustPolicy(), unexpected: marker }), JSON.stringify({ ...trustPolicy(), securityThreshold: 1 }), ' '.repeat(64 * 1024 + 1)]) {
        await writeFile(path, content);
        await rejects();
    }
    await rejects({ ...env, PTBK_CONFORMANCE_TRUST_FILE: '/conformance.json' });
});

test('UI loader paths: a bundle never occupies the engine’s own paths', () => {
    for (const path of ['/api', '/api/v1', '/api/v1/engine', '/auth', '/auth/sign-in', '/setup', '/setup/options', '/.well-known', '/.well-known/acme-challenge/x', '/_ptbk/harness-terminal', '/_ptbk/harness-terminal/xterm.js']) assert.equal(isEngineOwnedPath(path), true, path);
    for (const path of ['/', '/index.html', '/agents/1', '/assets/index-abcdefgh.js', '/apis', '/setups', '/authors']) assert.equal(isEngineOwnedPath(path), false, path);
});

test('UI loader without a bundle: the engine page in the security panel, nothing served, private state', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk ui empty');
    const loader = await UiLoader.create({ directory, env: {} });
    await loader.start();
    t.after(() => loader.stop());
    assert.equal(await loader.serve(request('/', { accept: 'text/html' })), undefined);
    const page = 'c'.repeat(64);
    assert.deepEqual(loader.status(page), { version: ENGINE_VERSION, bundleSha256: page, releaseLogIndex: null, releaseLogEntryUuid: null, lastUpdateCheck: null });
    if (POSIX) {
        assert.equal((await stat(join(directory, 'ui'))).mode & 0o777, 0o700);
        assert.equal((await stat(join(directory, 'ui', 'state.json'))).mode & 0o777, 0o600);
    }
});

test('UI loader serving: listed files only, SPA fallback for documents, cache headers, engine paths refused', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk ui serve');
    const index = '<!doctype html><meta name="ui" content="1.0.1">';
    const script = 'console.log(1);';
    const { env } = await installedBundle(directory, { 'index.html': index, 'assets/index-BxD3f9_a.js': script, 'favicon.svg': '<svg/>' });
    const loader = await UiLoader.create({ directory, env });
    await loader.start();
    t.after(() => loader.stop());

    const entry = await loader.serve(request('/', { accept: 'text/html' }));
    assert.equal(entry.status, 200);
    assert.equal(await entry.text(), index);
    assert.equal(entry.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(entry.headers.get('cache-control'), 'no-cache');

    const asset = await loader.serve(request('/assets/index-BxD3f9_a.js'));
    assert.equal(await asset.text(), script);
    assert.equal(asset.headers.get('content-type'), 'text/javascript; charset=utf-8');
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal((await loader.serve(request('/favicon.svg'))).headers.get('cache-control'), 'no-cache');

    const deepLink = await loader.serve(request('/agents/123', { accept: 'text/html' }));
    assert.equal(deepLink.status, 200);
    assert.equal(await deepLink.text(), index);
    const head = await loader.serve(request('/', { method: 'HEAD', accept: 'text/html' }));
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');

    // A miss in assets, a non-document miss, another method, the manifest and engine paths never get the entry.
    for (const [path, options] of [
        ['/assets/missing-00000000.js', { accept: 'text/html' }],
        ['/missing.js', {}],
        ['/', { method: 'POST', accept: 'text/html' }],
        ['/manifest.json', {}],
        ['/api/v1/engine', { accept: 'text/html' }],
        ['/auth/probe', { accept: 'text/html' }],
        ['/.well-known/probe', { accept: 'text/html' }],
    ]) {
        const response = await loader.serve(request(path, options));
        assert.equal(response.status, 404, path);
        assert.doesNotMatch(await response.text(), /meta name="ui"/, path);
    }

    const status = loader.status('c'.repeat(64));
    assert.equal(status.version, '1.0.1');
    assert.equal(status.bundleSha256, 'f'.repeat(64));
    assert.equal(status.releaseLogIndex, 42);
});

test('UI loader integrity: a file changed on disk is never served, and a damaged bundle is dropped at startup', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk ui tamper');
    const bundle = await installedBundle(directory, { 'index.html': '<!doctype html>v1', 'app.js': 'ok' });
    const logs = [];
    const loader = await UiLoader.create({ directory, env: bundle.env, log: (text, level) => logs.push({ text, level }) });
    await loader.start();
    t.after(() => loader.stop());
    assert.equal((await loader.serve(request('/app.js'))).status, 200);

    await writeFile(join(bundle.path, 'app.js'), 'tampered');
    const damaged = await loader.serve(request('/app.js'));
    assert.equal(damaged.status, 500);
    assert.doesNotMatch(await damaged.text(), /tampered/);
    assert.ok(logs.some((entry) => entry.level === 'error' && /changed on disk/.test(entry.text)));

    const restarted = await UiLoader.create({ directory, env: bundle.env, log: (text, level) => logs.push({ text, level }) });
    await restarted.start();
    t.after(() => restarted.stop());
    assert.equal(await restarted.serve(request('/', { accept: 'text/html' })), undefined);
    assert.equal(restarted.status('c'.repeat(64)).version, ENGINE_VERSION);
    assert.ok(logs.some((entry) => entry.level === 'error' && /no longer matches its manifest/.test(entry.text)));
    const state = JSON.parse(await readFile(join(directory, 'ui', 'state.json'), 'utf8'));
    assert.equal(state.active, undefined);
});

test('UI loader without a policy never serves a cached bundle or fetches a release', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk removed policy');
    await installedBundle(directory, { 'index.html': '<!doctype html>previous UI' });
    const loader = await UiLoader.create({ directory, env: { PTBK_UI_RELEASE_URL: 'https://store.localhost/' } });
    await loader.start();
    t.after(() => loader.stop());
    await loader.check();
    assert.equal(await loader.serve(request('/', { accept: 'text/html' })), undefined);
    assert.equal(loader.status('builtin').bundleSha256, 'builtin');
    assert.equal(loader.status('builtin').lastUpdateCheck, null);
});

test('engine page: escaped, for documents only, read-only methods', async () => {
    const actor = { displayName: '<b>Ann</b>', role: 'owner' };
    const page = engineHomePage(request('/', { accept: 'text/html' }), actor, { name: 'A & <B>', engineId: 'e"1' });
    assert.equal(page.status, 200);
    const body = await page.text();
    assert.doesNotMatch(body, /<b>Ann|<B>|e"1/);
    assert.match(body, /&#60;b&#62;Ann/);
    assert.doesNotMatch(body, /<script|<style|style=/);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal(engineHomePage(request('/', { method: 'POST' }), actor, { name: 'A' }).status, 405);
    assert.equal(engineHomePage(request('/app.js'), actor, { name: 'A' }).status, 404);
    assert.equal(engineHomePage(request('/agents/1', { accept: 'text/html' }), actor, { name: 'A' }).status, 200);
});

test('engine API state: folders, agent placement and request keys persist privately', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk api state');
    const state = await EngineApiState.open(directory);
    const folder = await state.createFolder('Research');
    assert.equal(await state.createFolder('research'), undefined, 'names are unique ignoring case');
    const other = await state.createFolder('Ops');
    assert.equal(await state.renameFolder(other.id, 'RESEARCH'), 'taken');
    assert.equal(await state.renameFolder('missing', 'X'), undefined);
    await state.recordAgent('agent-1', { folderId: folder.id, visibility: 'public', creator: 'member-1' });
    assert.equal(await state.deleteFolder(folder.id, new Set(['agent-1'])), 'not-empty');
    assert.equal(await state.deleteFolder('missing', new Set()), 'missing');
    await state.recordSentKey('key-1', { chatId: 'c', digest: 'd', messageId: 'c#1', at: new Date(0).toISOString() });
    await state.recordMessageAuthor('c#1', 'member-1');

    const reopened = await EngineApiState.open(directory);
    assert.deepEqual(reopened.folders().map((entry) => entry.name), ['Ops', 'Research']);
    assert.equal(reopened.agentFolder('agent-1'), folder.id);
    assert.equal(reopened.agentVisibility('agent-1'), 'public');
    assert.equal(reopened.agentVisibility('agent-2'), 'private');
    assert.equal(reopened.agentCreator('agent-1'), 'member-1');
    assert.equal(reopened.sentKey('key-1').messageId, 'c#1');
    assert.equal(reopened.messageAuthor('c#1'), 'member-1');
    assert.equal(await reopened.deleteFolder(folder.id, new Set()), 'deleted', 'a folder of removed agents only is empty');
    assert.equal(reopened.agentFolder('agent-1'), null);
    if (POSIX) assert.equal((await stat(join(directory, 'engine-api.json'))).mode & 0o777, 0o600);

    await writeFile(join(directory, 'engine-api.json'), '{ damaged', { mode: 0o600 });
    await assert.rejects(EngineApiState.open(directory), /engine-api\.json is damaged/);
});
