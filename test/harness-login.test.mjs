import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { harnessLoginMethods, loginHarness, loginLocation, serviceReadinessProblem } from '../dist/harness/maintenance.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { fakeHarness, temporaryDirectory } from './helpers.mjs';

/** The fake Codex CLI with file-backed native sign-in; no provider, browser or real account is used. */
async function fixture(t, extra = {}) {
    const root = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, root);
    const loginLog = join(root, 'login.log');
    return { root, loginLog, context: { projectRoot: root, env: { ...env, FAKE_CODEX_AUTH_FILE: join(root, 'auth'), FAKE_CODEX_LOGIN_LOG: loginLog, ...extra } } };
}

/** Collects relayed native output, which only the attended terminal may see. */
function relay() {
    const chunks = [];
    return { chunks, write: (text) => chunks.push(text) };
}

test('login location: the launcher or explicit choice wins; SSH and display-less Linux are remote', () => {
    assert.equal(loginLocation({ SSH_CONNECTION: '203.0.113.5 50000 198.51.100.7 22' }, 'darwin').location, 'remote');
    assert.equal(loginLocation({}, 'linux').location, 'remote');
    assert.equal(loginLocation({ DISPLAY: ':0' }, 'linux').location, 'local');
    assert.equal(loginLocation({ WSL_DISTRO_NAME: 'Ubuntu' }, 'linux').location, 'local');
    assert.equal(loginLocation({}, 'darwin').location, 'local');
    assert.equal(loginLocation({}, 'win32').location, 'local');
    assert.equal(loginLocation({ PTBK_LOGIN_LOCATION: 'remote', DISPLAY: ':0' }, 'linux').location, 'remote');
    assert.equal(loginLocation({ PTBK_LOGIN_LOCATION: 'local', SSH_TTY: '/dev/pts/0' }, 'linux').location, 'local');
});

test('Codex offers device-code login first on a remote host and an SSH callback alternative, never an API key', async (t) => {
    const { context } = await fixture(t);
    const plugin = harnessPlugin('openai-codex');
    const remote = await harnessLoginMethods(plugin, context, 'remote');
    assert.deepEqual(remote.map((method) => method.id), ['device-code', 'callback-forwarding']);
    assert.deepEqual(remote[0].args, ['login', '--device-auth']);
    assert.equal(remote[0].terminal, 'relay');
    assert.match(remote[0].instructions, /another device|phone or computer/);
    assert.match(remote[1].instructions, /ssh -N -L 1455:localhost:1455/);
    const local = await harnessLoginMethods(plugin, context, 'local');
    assert.deepEqual(local.map((method) => method.id), ['browser', 'device-code']);
    for (const method of [...remote, ...local]) assert.doesNotMatch(method.args.join(' '), /api-key|access-token/);

    const older = await fixture(t, { FAKE_CODEX_NO_DEVICE_AUTH: '1' });
    const fallback = await harnessLoginMethods(plugin, older.context, 'remote');
    assert.deepEqual(fallback.map((method) => method.id), ['callback-forwarding'], 'no unsupported device flag is invented');
    assert.match(fallback[0].instructions, /no device-code login/);
});

test('device-code login relays the code to the terminal only, rechecks readiness and never sets up API billing', { skip: process.platform === 'win32' }, async (t) => {
    const { context, loginLog } = await fixture(t, { OPENAI_API_KEY: '' });
    const plugin = harnessPlugin('openai-codex');
    const [device] = await harnessLoginMethods(plugin, context, 'remote');
    assert.equal((await plugin.inspect(context)).authenticated, false);
    const output = relay();
    const result = await loginHarness(plugin, context, device, { location: 'remote', service: context, write: output.write });
    assert.equal(result.outcome, 'authenticated', result.diagnostic);
    assert.match(output.chunks.join(''), /FAKE-C0DE/, 'the owner sees the one-time code live');
    assert.doesNotMatch(JSON.stringify(result), /FAKE-C0DE|auth\.example\.test/, 'the result keeps no code or credential-bearing URL');
    const recorded = JSON.parse((await readFile(loginLog, 'utf8')).trim());
    assert.equal(recorded.browser, 'false', 'a remote host never falls back to a terminal browser');
    assert.equal(recorded.apiKey, false);
    assert.equal((await plugin.inspect(context)).authenticated, true);
});

test('expiry, a disabled policy and denial are distinct, honest outcomes that leave the sign-in incomplete', { skip: process.platform === 'win32' }, async (t) => {
    const plugin = harnessPlugin('openai-codex');
    for (const [result, outcome, pattern] of [['expired', 'expired', /expired/], ['disabled', 'unsupported', /security settings|administrator/], ['denied', 'denied', /denied/]]) {
        const { context } = await fixture(t, { FAKE_CODEX_LOGIN_RESULT: result });
        const [device] = await harnessLoginMethods(plugin, context, 'remote');
        const login = await loginHarness(plugin, context, device, { location: 'remote', service: context, write: relay().write });
        assert.equal(login.outcome, outcome, login.diagnostic);
        assert.match(login.diagnostic, pattern);
        assert.doesNotMatch(login.diagnostic, /FAKE-C0DE/);
        assert.equal((await plugin.inspect(context)).authenticated, false);
    }
});

test('a sign-in the background service cannot use is a discovery failure, not readiness', { skip: process.platform === 'win32' }, async (t) => {
    const { root, context } = await fixture(t);
    const plugin = harnessPlugin('openai-codex');
    const [device] = await harnessLoginMethods(plugin, context, 'remote');
    const elsewhere = join(root, 'service bin');
    await mkdir(elsewhere);
    const service = { projectRoot: root, env: { ...context.env, PATH: [elsewhere, '/usr/bin', '/bin'].join(delimiter) } };
    const result = await loginHarness(plugin, context, device, { location: 'remote', service, write: relay().write });
    assert.equal(result.outcome, 'discovery');
    assert.match(result.diagnostic, /cannot find `codex`/);
    assert.equal(await serviceReadinessProblem(plugin, context), undefined);
    const missing = await loginHarness(plugin, service, device, { location: 'remote', write: relay().write });
    assert.equal(missing.outcome, 'missing');
});

test('Claude Code uses its native subscription login with a pasted return code, not an invented device flag', { skip: process.platform === 'win32' }, async (t) => {
    const root = await temporaryDirectory(t);
    const bin = join(root, 'bin');
    await mkdir(bin);
    await writeFile(join(bin, 'claude'), `#!/bin/sh\nif [ "$1 $2 $3" = "auth login --help" ]; then printf 'Usage: claude auth login [options]\\n  --claudeai\\n  --console\\n'; exit 0; fi\nexit 1\n`);
    await chmod(join(bin, 'claude'), 0o755);
    const context = { projectRoot: root, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } };
    const plugin = harnessPlugin('claude-code');
    const [remote] = await harnessLoginMethods(plugin, context, 'remote');
    assert.equal(remote.id, 'url-code');
    assert.deepEqual(remote.args, ['auth', 'login', '--claudeai']);
    assert.equal(remote.terminal, 'inherit', 'the native prompt for the return code keeps the terminal');
    assert.match(remote.instructions, /paste it here/);
    assert.match(remote.instructions, /Nothing needs to open on this server/);
    const [local] = await harnessLoginMethods(plugin, context, 'local');
    assert.equal(local.id, 'browser');
    assert.doesNotMatch([...remote.args, ...local.args].join(' '), /--console|device/);
});

test('harnesses without a declared remote method are explained instead of pretending', async () => {
    const opencode = harnessPlugin('opencode');
    const [method] = await harnessLoginMethods(opencode, { projectRoot: process.cwd(), env: process.env }, 'remote');
    assert.equal(method.remote, false);
    assert.deepEqual(await harnessLoginMethods(harnessPlugin('gemini'), { projectRoot: process.cwd(), env: process.env }, 'remote'), []);
});
