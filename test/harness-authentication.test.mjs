import assert from 'node:assert/strict';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { HarnessPool } from '../dist/engine/harnesses.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { resolveSettings } from '../dist/project/config.js';
import { temporaryDirectory } from './helpers.mjs';

/**
 * A deterministic stand-in for the five non-Codex CLIs: each reports a version, and the probes that decide native
 * readiness answer from marker files in `$HOME` (a native login) or from the API variables it can see.
 */
const FAKE_CLI = `
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const [name, ...args] = process.argv.slice(2);
const home = process.env.HOME || process.env.USERPROFILE || '';
const line = args.join(' ');
if (line === '--version') { console.log('1.0.0'); process.exit(0); }
if (line === '--help') { console.log(name === 'qwen' ? '--auth-type  Authentication type [choices: "openai", "qwen-oauth"]' : 'Usage'); process.exit(0); }
if (name === 'claude' && line === 'auth status --json') {
    if (existsSync(join(home, '.claude-fixture-login')) || process.env.CLAUDE_CODE_OAUTH_TOKEN) console.log(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' }));
    else if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) console.log(JSON.stringify({ loggedIn: true, authMethod: 'api_key', apiKeySource: 'ANTHROPIC_API_KEY' }));
    else console.log(JSON.stringify({ loggedIn: false }));
    process.exit(0);
}
if (name === 'opencode' && line === 'auth list') {
    const stored = existsSync(join(process.env.XDG_DATA_HOME || join(home, '.local', 'share'), 'opencode', 'auth.json')) ? 1 : 0;
    const environment = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'].filter((key) => process.env[key]);
    console.log(stored + ' credentials' + (environment.length ? '\\nEnvironment: ' + environment.join(', ') : ''));
    process.exit(0);
}
process.exit(0);
`;

/** Every ambient credential and route selector a careless adapter could pick up. */
const AMBIENT = {
    GEMINI_API_KEY: 'ambient-gemini', GOOGLE_API_KEY: 'ambient-google', GOOGLE_GENAI_USE_VERTEXAI: 'true',
    OPENAI_API_KEY: 'ambient-openai', OPENAI_BASE_URL: 'https://ambient.example/v1', DASHSCOPE_API_KEY: 'ambient-dashscope', QWEN_API_KEY: 'ambient-qwen',
    ANTHROPIC_API_KEY: 'ambient-anthropic', ANTHROPIC_AUTH_TOKEN: 'ambient-bearer', CLAUDE_CODE_USE_BEDROCK: '1',
    OPENROUTER_API_KEY: 'ambient-openrouter', GOOGLE_GENERATIVE_AI_API_KEY: 'ambient-google-ai',
    COPILOT_GITHUB_TOKEN: 'ambient-copilot', GH_TOKEN: 'ambient-gh', GITHUB_TOKEN: 'ambient-github',
};

/** The adapters this boundary covers, with their CLI executable. */
const ADAPTERS = [['CLAUDE_CODE', 'claude'], ['GEMINI', 'gemini'], ['QWEN_CODE', 'qwen'], ['OPENCODE', 'opencode'], ['GITHUB_COPILOT', 'copilot']];

/**
 * Installs the fake CLIs and returns an environment with a fresh home and every ambient credential.
 */
async function fixture(t) {
    const root = await temporaryDirectory(t, 'ptbk harness authentication');
    const bin = join(root, 'bin');
    const home = join(root, 'home');
    await mkdir(bin, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(join(bin, 'fake-cli.cjs'), FAKE_CLI);
    for (const [, executable] of ADAPTERS) {
        if (process.platform === 'win32') await writeFile(join(bin, `${executable}.cmd`), `@echo off\r\n"${process.execPath}" "%~dp0fake-cli.cjs" ${executable} %*\r\n`);
        else {
            await writeFile(join(bin, executable), `#!/bin/sh\nexec "${process.execPath}" "${join(bin, 'fake-cli.cjs')}" ${executable} "$@"\n`);
            await chmod(join(bin, executable), 0o755);
        }
    }
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const env = { ...process.env, [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ''}`, HOME: home, USERPROFILE: home, PTBK_HOME: join(root, 'ptbk home'), XDG_DATA_HOME: join(home, '.local', 'share'), ...AMBIENT };
    for (const key of ['CODEX_HOME', 'GEMINI_CLI_HOME', 'COPILOT_HOME', 'CLAUDE_CONFIG_DIR', 'CLAUDE_CODE_OAUTH_TOKEN']) delete env[key];
    return { root, home, env };
}

/** Native logins of every adapter in the fixture home. */
async function signInNatively(home) {
    await writeFile(join(home, '.claude-fixture-login'), 'yes');
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', 'oauth_creds.json'), '{}');
    await mkdir(join(home, '.qwen'), { recursive: true });
    await writeFile(join(home, '.qwen', 'oauth_creds.json'), '{}');
    await mkdir(join(home, '.local', 'share', 'opencode'), { recursive: true });
    await writeFile(join(home, '.local', 'share', 'opencode', 'auth.json'), '{}');
    await mkdir(join(home, '.copilot'), { recursive: true });
    await writeFile(join(home, '.copilot', 'config.json'), JSON.stringify({ logged_in_users: [{ login: 'fixture' }] }));
}

/** A pool over one NATIVE instance per adapter. */
async function nativePool(root, env) {
    const tools = ADAPTERS.map(([variant]) => ({ type: 'HARNESS', variant, name: `${variant.toLowerCase().replace(/_/g, '-')}-native`, authentication: 'NATIVE' }));
    const pool = new HarnessPool(root, resolveSettings({ file: { tools } }), env);
    await pool.refresh();
    return { pool, names: tools.map((tool) => tool.name) };
}

test('harness authentication: a NATIVE instance with only ambient API credentials stays unready for every adapter', async (t) => {
    const { root, env } = await fixture(t);
    const before = JSON.stringify(process.env);
    const { pool, names } = await nativePool(root, env);
    for (const name of names) {
        const inspection = pool.inspectionOf(name);
        assert.equal(inspection.installed, true, `${name}: ${inspection.summary}`);
        assert.equal(inspection.usable, false, `${name} must not become ready from ambient credentials: ${inspection.summary}`);
        assert.notEqual(inspection.authentication, 'api', name);
        const visible = pool.environment(pool.instance(name));
        const plugin = harnessPlugin(pool.instance(name).variant.toLowerCase().replace(/_/g, '-'));
        for (const key of plugin.ambientApiKeyVariables ?? []) if (!(key in (plugin.modeEnvironment?.NATIVE ?? {}))) assert.equal(visible[key], undefined, `${name} never sees ${key}`);
    }
    assert.equal(JSON.stringify(process.env), before, 'probes never mutate the shared environment');

    // A CLI configured for an API route in its own settings is not a native login either.
    const { root: second, home, env: secondEnv } = await fixture(t);
    await mkdir(join(home, '.gemini'), { recursive: true });
    await writeFile(join(home, '.gemini', 'oauth_creds.json'), '{}');
    await writeFile(join(home, '.gemini', 'settings.json'), JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } } }));
    const settingsPool = new HarnessPool(second, resolveSettings({ file: { tools: [{ type: 'HARNESS', variant: 'GEMINI', name: 'gemini', authentication: 'NATIVE' }] } }), secondEnv);
    await settingsPool.refresh();
    assert.equal(settingsPool.inspectionOf('gemini').usable, false);
    assert.match(settingsPool.inspectionOf('gemini').summary, /only API credentials are visible/);
});

test('harness authentication: a valid native login with ambient API credentials keeps native readiness and a native invocation', async (t) => {
    const { root, home, env } = await fixture(t);
    await signInNatively(home);
    const { pool, names } = await nativePool(root, { ...env, CLAUDE_CODE_OAUTH_TOKEN: 'native-subscription-token' });
    for (const name of names) {
        const inspection = pool.inspectionOf(name);
        assert.equal(inspection.usable, true, `${name}: ${inspection.summary}`);
        assert.equal(inspection.authentication, 'account', name);
    }
    const claude = pool.environment(pool.instance('claude-code-native'));
    assert.equal(claude.CLAUDE_CODE_OAUTH_TOKEN, 'native-subscription-token', 'the selected native credential context is preserved');
    assert.equal(claude.ANTHROPIC_API_KEY, undefined);
    assert.equal(claude.CLAUDE_CODE_USE_BEDROCK, undefined);
    assert.equal(pool.environment(pool.instance('gemini-native')).GOOGLE_GENAI_USE_GCA, 'true', 'Gemini is told to use the Google login');
    assert.equal(pool.environment(pool.instance('github-copilot-native')).GH_TOKEN, undefined, 'a token cannot override the stored Copilot login');

    const qwen = harnessPlugin('qwen-code');
    const qwenEnv = pool.environment(pool.instance('qwen-code-native'));
    const invocation = await qwen.buildInvocation({ projectRoot: root, env: qwenEnv, authentication: 'account', readOnly: false, readableDirectories: [], promptFile: 'prompt.md', prompt: '' });
    assert.deepEqual(invocation.args.slice(invocation.args.indexOf('--auth-type'), invocation.args.indexOf('--auth-type') + 2), ['--auth-type', 'qwen-oauth'], 'the captured invocation selects the native route');
    assert.equal(invocation.env.OPENAI_API_KEY, undefined);
    assert.equal(invocation.env.DASHSCOPE_API_KEY, undefined);
});

test('harness authentication: each API_KEY instance receives only its configured credential; a missing one borrows nothing', async (t) => {
    const { root, home, env } = await fixture(t);
    await signInNatively(home);
    const tools = [
        { type: 'HARNESS', variant: 'GEMINI', name: 'gemini-a', authentication: 'API_KEY', apiKey: '${{ env.KEY_A }}' },
        { type: 'HARNESS', variant: 'GEMINI', name: 'gemini-b', authentication: 'API_KEY', apiKey: '${{ env.KEY_B }}' },
        { type: 'HARNESS', variant: 'QWEN_CODE', name: 'qwen-api', authentication: 'API_KEY', apiKey: '${{ env.KEY_A }}' },
        { type: 'HARNESS', variant: 'OPENCODE', name: 'opencode-api', authentication: 'API_KEY', apiKey: '${{ env.KEY_B }}' },
    ];
    const pool = new HarnessPool(root, resolveSettings({ file: { tools } }), { ...env, KEY_A: 'configured-a', KEY_B: '' });
    await pool.refresh();
    const a = pool.environment(pool.instance('gemini-a'));
    assert.equal(pool.inspectionOf('gemini-a').usable, true);
    assert.equal(a.GEMINI_API_KEY, 'configured-a');
    assert.equal(a.GOOGLE_API_KEY, undefined);
    assert.equal(a.GOOGLE_GENAI_USE_VERTEXAI, undefined);
    assert.notEqual(a.GEMINI_CLI_HOME, undefined, 'an isolated configuration home: the Google login cannot substitute');
    for (const name of ['gemini-b', 'opencode-api']) {
        assert.equal(pool.inspectionOf(name).usable, false, `${name}: an empty selected credential is not ready`);
        const missing = pool.environment(pool.instance(name));
        assert.equal(missing.GEMINI_API_KEY, undefined, `${name} cannot borrow the other instance's key`);
        assert.equal(missing.OPENCODE_API_KEY, undefined);
        if (name === 'opencode-api') assert.equal(missing.OPENROUTER_API_KEY, undefined, 'nor an alternate provider key');
    }
    assert.notEqual(pool.environment(pool.instance('opencode-api')).XDG_DATA_HOME, env.XDG_DATA_HOME, 'stored OpenCode logins are out of reach');

    const qwen = harnessPlugin('qwen-code');
    const invocation = await qwen.buildInvocation({ projectRoot: root, env: pool.environment(pool.instance('qwen-api')), authentication: 'api', readOnly: false, readableDirectories: [], promptFile: 'prompt.md', prompt: '' });
    assert.ok(invocation.args.includes('--auth-type') && invocation.args[invocation.args.indexOf('--auth-type') + 1] === 'openai');
    assert.equal(invocation.env.OPENAI_API_KEY, 'configured-a');
    assert.equal(invocation.env.OPENAI_BASE_URL, qwen.endpoints.official, 'the key goes to the selected endpoint, never an ambient override');
    assert.equal(invocation.env.DASHSCOPE_API_KEY, undefined);
});
