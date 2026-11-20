import assert from 'node:assert/strict';
import { cp, copyFile, readFile, readdir, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { zstdCompressSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { appBuildSource, STAGING_POLICY_SHA256 } from '../scripts/build-app-profile.mjs';
import { protocol, releaseTools } from '../dist/vendor/app-platform.js';
import { temporaryDirectory, ROOT } from './helpers.mjs';

/** Loads the real compiled App modules with a different build-time gate, never a runtime setting. */
async function build(t, profile) {
    const cleanup = [];
    const root = await temporaryDirectory(t, 'app profile ' + profile, cleanup);
    const dist = join(ROOT, 'dist');
    await cp(join(dist, 'app'), join(root, 'app'), { recursive: true });
    for (const name of await readdir(dist)) {
        if (name === 'app') continue;
        if ((await stat(join(dist, name))).isDirectory()) await symlink(join(dist, name), join(root, name), 'junction');
        else await copyFile(join(dist, name), join(root, name));
    }
    const gate = await readFile(join(dist, 'app', 'build.js'), 'utf8');
    const policy = await readFile(join(ROOT, 'scripts', 'app-platform', 'trust-policy.staging.json'));
    await writeFile(join(root, 'app', 'build.js'), appBuildSource(gate, profile, policy));
    return {
        root, policy, cleanup,
        ...(await import(pathToFileURL(join(root, 'app', 'web', 'ui-loader.js')).href)),
        ...(await import(pathToFileURL(join(root, 'app', 'settings.js')).href)),
        ...(await import(pathToFileURL(join(root, 'app', 'build.js')).href)),
    };
}

test('STG-01/02: staging has immutable defaults and an embedded policy, including under NODE_ENV=production', async (t) => {
    const s = await build(t, 'staging');
    for (const env of [{}, { NODE_ENV: 'production' }]) {
        const logs = [];
        const loader = await s.UiLoader.create({ directory: s.root, env, log: (text) => logs.push(text) });
        assert.equal(loader.options.releaseUrl, 'https://ui.ptbk.link/');
        assert.equal(loader.options.trust.policy.profile, 'staging');
        assert.equal(s.appSettings(env).engineDomain, 'engines.ptbk.link');
        assert.ok(logs.includes('UI trust: built-in staging policy'));
        assert.equal(s.CONFORMANCE_BUILD, false);
    }
});

test('STG-03/04: explicit local settings win; an invalid policy refuses without embedded fallback', async (t) => {
    const s = await build(t, 'staging');
    const policy = JSON.parse(s.policy.toString());
    delete policy.profile;
    policy.delays = protocol.RELEASE_DELAYS;
    const file = join(s.root, 'local-policy.json');
    await writeFile(file, JSON.stringify(policy));
    const env = { NODE_ENV: 'production', PTBK_UI_TRUST_POLICY_FILE: file, PTBK_UI_RELEASE_URL: 'https://mirror.example/', PTBK_ENGINE_DOMAIN: 'engines.example' };
    const loader = await s.UiLoader.create({ directory: s.root, env });
    assert.equal(loader.options.releaseUrl, 'https://mirror.example/');
    assert.equal(loader.options.trust.policy.profile, undefined);
    assert.equal(s.appSettings(env).engineDomain, 'engines.example');
    await writeFile(file, 'not a policy');
    await assert.rejects(s.UiLoader.create({ directory: s.root, env }), /not a valid TrustPolicy/);
    assert.throws(() => s.appSettings({ NODE_TLS_REJECT_UNAUTHORIZED: '0' }), /certificate verification/);
});

test('STG-05: a staging release never admits test trust', async (t) => {
    const s = await build(t, 'staging');
    await assert.rejects(s.UiLoader.create({ directory: s.root, env: { PTBK_CONFORMANCE_TRUST_FILE: '/test/trust.json' } }), /PTBK_CONFORMANCE_TRUST_FILE.*release build/);
});

test('STG-06/07/08/09: production and source cannot become staging through environment variables', async (t) => {
    for (const profile of ['production', 'development']) {
        const p = await build(t, profile);
        const loader = await p.UiLoader.create({ directory: p.root, env: { PTBK_BUILD_PROFILE: 'staging' } });
        assert.equal(loader.options.trust, undefined);
        assert.equal(loader.options.releaseUrl, undefined);
        assert.equal(p.appSettings({ PTBK_BUILD_PROFILE: 'staging' }).engineDomain, undefined);
        const file = join(p.root, 'staging.json');
        await writeFile(file, p.policy);
        await assert.rejects(p.UiLoader.create({ directory: p.root, env: { NODE_ENV: 'production', PTBK_UI_TRUST_POLICY_FILE: file } }), /staging trust policy.*production/);
    }
});

test('STG-10: the build checks the exact pinned policy bytes and profile', async () => {
    const source = await readFile(join(ROOT, 'dist', 'app', 'build.js'), 'utf8');
    const policy = await readFile(join(ROOT, 'scripts', 'app-platform', 'trust-policy.staging.json'));
    assert.equal((await import('node:crypto')).createHash('sha256').update(policy).digest('hex'), STAGING_POLICY_SHA256);
    assert.match(appBuildSource(source, 'staging', policy), /APP_BUILD_PROFILE = "staging"/);
    assert.throws(() => appBuildSource(source, 'staging', Buffer.from('{}')), /SHA-256/);
    assert.throws(() => appBuildSource(source, 'staging', Buffer.concat([policy, Buffer.from('\n')])), /SHA-256/);
    assert.throws(() => appBuildSource(source, 'unknown', policy), /Unknown/);
    assert.doesNotMatch(appBuildSource(source, 'production', policy), /2yvEnNV41TFH/);
});

test('npm publication requires the staging profile selected by the release wrapper', () => {
    const base = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'webgptorg/promptbook', RELEASE_TAG: 'v1.0.0' };
    for (const profile of ['staging', 'development', 'production', '']) {
        const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'assert-publish-context.mjs')], { encoding: 'utf8', env: { ...base, PTBK_BUILD_PROFILE: profile } });
        assert.equal(result.status === 0, profile === 'staging', result.stderr);
    }
});

test('STG-11: remote policy-looking settings cannot replace built-in trust or store', async (t) => {
    const s = await build(t, 'staging');
    const env = { PTBK_BUILD_PROFILE: 'production', PTBK_TRUST_POLICY: '{}', PTBK_RELEASE_URL: 'https://other.example/' };
    const loader = await s.UiLoader.create({ directory: s.root, env });
    assert.equal(loader.options.releaseUrl, 'https://ui.ptbk.link/');
    assert.deepEqual(loader.options.trust.policy, JSON.parse(s.policy.toString()));
});

/** A real DSSE-signed mirror and archives, with only the provenance port and transport replaced in this test. */
async function releaseStore(t) {
    const s = await build(t, 'staging');
    const signer = async () => protocol.createWebCryptoSigner(await protocol.generateEd25519KeyPair({ extractable: false }));
    const keys = await Promise.all(Array.from({ length: 5 }, signer));
    const keyRef = key => ({ publicKey: Buffer.from(key.publicKey()).toString('base64url') });
    const policy = { ...JSON.parse(s.policy.toString()), releaseKeys: [keyRef(keys[0])], maintainerKeys: keys.slice(1, 4).map(keyRef) };
    const file = join(s.root, 'fixture-policy.json');
    await writeFile(file, JSON.stringify(policy));
    const logs = [];
    const loader = await s.UiLoader.create({ directory: join(s.root, 'data'), env: { PTBK_UI_TRUST_POLICY_FILE: file }, log: text => logs.push(text) });
    s.cleanup.push(async () => {
        await loader.stop();
        for (const entry of await readdir(join(loader.options.directory, 'ui'), { withFileTypes: true })) {
            if (entry.isDirectory()) await loader.remove(join(loader.options.directory, 'ui', entry.name));
        }
    });
    let attestation = { kind: 'verified', logIndex: 42, trustedTime: new Date(Date.now() - 1000) };
    loader.options.trust.provenance = { verifyProvenance: async (_bundle, _envelope, expected) => {
        assert.equal(expected.issuer, policy.workflowIdentity.issuer);
        return attestation;
    } };
    const mirror = new Map();
    loader.get = async path => ({ status: mirror.has(path) ? 200 : 404, body: mirror.get(path) ?? Buffer.alloc(0) });
    const json = value => Buffer.from(JSON.stringify(value));
    const hash = value => createHash('sha256').update(value).digest('hex');
    const time = value => new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const sign = async (type, body, key = keys[0]) => protocol.signDsse(key, type, json(body));
    const revocations = async (revoked = []) => {
        mirror.set('release-log/revocations.json', json(await sign(protocol.REVOCATION_PAYLOAD_TYPE, {
            v: 1, issuedAt: time(Date.now() - 1000), expiresAt: time(Date.now() + 86400000), revoked,
        })));
    };
    const release = async (version, { outsider = false, badHash = false } = {}) => {
        const bytes = Buffer.from('<!doctype html><title>Signed UI ' + version + '</title>');
        const commit = 'a'.repeat(40);
        const manifest = protocol.UiBundleManifest.parse({ v: 1, version, commit, engineApi: '^1.0.0', entry: 'index.html', csp: '',
            files: [{ path: 'index.html', size: bytes.length, sha256: hash(bytes) }] });
        const archive = zstdCompressSync(releaseTools.writeTar([
            { path: 'manifest.json', bytes: json(manifest) }, { path: 'index.html', bytes },
        ], { first: 'manifest.json', mtime: 0 }));
        const name = 'engine-ui.tar.zst';
        const entry = protocol.ReleaseEntry.parse({ v: 1, version, commit, gitTag: 'ui-v' + version, kind: 'regular', advisory: null,
            publishedAt: time(Date.now() - 1000), artifacts: [{ name, kind: 'ui', sha256: badHash ? 'f'.repeat(64) : hash(archive) }] });
        mirror.set('ui/latest.json', json({ version }));
        mirror.set('release-log/ui-' + version + '.json', json({ v: 1, envelope: await sign(protocol.RELEASE_PAYLOAD_TYPE, entry, keys[outsider ? 4 : 0]), provenance: 'fixture' }));
        mirror.set('ui/' + version + '/' + name, archive);
    };
    t.after(() => loader.stop());
    await revocations();
    await release('1.0.1');
    await loader.start();
    await loader.check();
    return { loader, logs, release, revocations, setAttestation: value => { attestation = value; } };
}

test('STG-12: installer approval serves a verified first bundle inside the delay', async t => {
    const { loader } = await releaseStore(t);
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'delay-not-elapsed');
    assert.equal(await loader.serve(new Request('https://engine.test/', { headers: { accept: 'text/html' } })), undefined);
    await loader.approveInitialBundle();
    const view = loader.status('0'.repeat(64));
    assert.equal(view.lastUpdateCheck.outcome, 'installed');
    assert.equal(view.releaseLogIndex, 42);
    assert.match(await (await loader.serve(new Request('https://engine.test/'))).text(), /Signed UI 1.0.1/);
    assert.equal(JSON.parse(await readFile(join(loader.options.directory, 'ui', 'state.json'), 'utf8')).initialBundleInstalled, true);
});

test('STG-13: first approval still refuses revoked, untrusted, unlogged and corrupt releases', async t => {
    const { loader, release, revocations, setAttestation, logs } = await releaseStore(t);
    await revocations([{ version: '1.0.1', reason: 'test withdrawal' }]);
    await loader.approveInitialBundle();
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'revoked');
    await revocations();
    await release('1.0.1', { outsider: true });
    await loader.approveInitialBundle();
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'signature-threshold-not-met');
    await release('1.0.1');
    setAttestation({ kind: 'not-in-log', reason: 'fixture missing entry' });
    await loader.approveInitialBundle();
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'not-in-log');
    setAttestation({ kind: 'verified', logIndex: 42, trustedTime: new Date() });
    await release('1.0.1', { badHash: true });
    await loader.approveInitialBundle();
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'hash-mismatch');
    assert.equal(await loader.serve(new Request('https://engine.test/')), undefined);
    for (const reason of ['revoked', 'signature-threshold-not-met', 'not-in-log', 'hash-mismatch']) assert.ok(logs.some(line => line.includes(reason)));
});

test('STG-14: later automatic updates wait, recheck at eligibility, and never regain first approval', async t => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() });
    const { loader, release, revocations } = await releaseStore(t);
    await loader.approveInitialBundle();
    await release('1.0.2');
    await loader.check();
    assert.equal(loader.status('0'.repeat(64)).version, '1.0.1');
    assert.equal(loader.status('0'.repeat(64)).lastUpdateCheck.reason, 'delay-not-elapsed');
    await loader.approveInitialBundle();
    assert.equal(loader.status('0'.repeat(64)).version, '1.0.1');
    t.mock.timers.tick(300000 + 5001);
    assert.ok(loader.running, 'the eligibility timer starts an automatic check');
    await loader.running;
    assert.equal(loader.status('0'.repeat(64)).version, '1.0.2');
    await release('1.0.3');
    await revocations(['1.0.1', '1.0.2'].map(version => ({ version, reason: 'test withdrawal' })));
    await loader.check();
    assert.equal(await loader.serve(new Request('https://engine.test/')), undefined);
    await loader.stop();
    const restarted = await loader.constructor.create(loader.options);
    t.after(() => restarted.stop());
    restarted.options.trust.provenance = loader.options.trust.provenance;
    restarted.get = loader.get;
    await restarted.start();
    await restarted.check();
    await restarted.approveInitialBundle();
    assert.equal(await restarted.serve(new Request('https://engine.test/')), undefined);
    assert.equal(restarted.status('0'.repeat(64)).lastUpdateCheck.reason, 'delay-not-elapsed');
});
