import assert from 'node:assert/strict';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { HarnessPool, instanceEnvironment } from '../dist/engine/harnesses.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { resolveSettings } from '../dist/project/config.js';
import { fakeHarness, temporaryDirectory } from './helpers.mjs';

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
        for (const key of plugin.ambientApiKeyVariables ?? []) if (!(key in (plugin.modeEnvironment?.NATIVE ?? {}))) assert.ok(!visible[key], `${name} never sees ${key}`);
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
    assert.equal(a.GOOGLE_API_KEY, '');
    assert.equal(a.GOOGLE_GENAI_USE_VERTEXAI, '');
    assert.notEqual(a.GEMINI_CLI_HOME, undefined, 'an isolated configuration home: the Google login cannot substitute');
    for (const name of ['gemini-b', 'opencode-api']) {
        assert.equal(pool.inspectionOf(name).usable, false, `${name}: an empty selected credential is not ready`);
        const missing = pool.environment(pool.instance(name));
        assert.ok(!missing.GEMINI_API_KEY, `${name} cannot borrow the other instance's key`);
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

test('harness authentication: NONE inherits no cloud credential, Google Cloud context stays native-only and Gemini masks removed variables against the project .env', () => {
    const base = {
        PTBK_HOME: '/engine', PATH: '/usr/bin', GH_TOKEN: 'work-token',
        AWS_ACCESS_KEY_ID: 'AKIAFIXTURE', AWS_SECRET_ACCESS_KEY: 'aws-secret', AWS_PROFILE: 'bedrock', AWS_BEARER_TOKEN_BEDROCK: 'bedrock-bearer',
        GOOGLE_APPLICATION_CREDENTIALS: '/keys/service-account.json', GOOGLE_CLOUD_PROJECT: 'billing-project', AZURE_OPENAI_API_KEY: 'azure-key',
        OPENAI_API_KEY: 'hosted-openai', ANTHROPIC_API_KEY: 'hosted-anthropic', CLAUDE_CODE_OAUTH_TOKEN: 'subscription-token',
        CLOUD_SHELL: 'true', GEMINI_CLI_USE_COMPUTE_ADC: 'true', GEMINI_CLI_AUTH_OVERRIDE: 'vertex-ai', GEMINI_DEFAULT_AUTH_TYPE: 'compute-default-credentials',
    };
    const snapshot = JSON.stringify(base);
    for (const [id, variant] of [['openai-codex', 'OPENAI_CODEX'], ['claude-code', 'CLAUDE_CODE'], ['qwen-code', 'QWEN_CODE']]) {
        const env = instanceEnvironment(harnessPlugin(id), { type: 'HARNESS', variant, name: `${id}-local`, authentication: 'NONE', inferenceRuntime: 'local-ollama' }, undefined, base);
        for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_PROFILE', 'AWS_BEARER_TOKEN_BEDROCK', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_PROJECT', 'AZURE_OPENAI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN']) {
            assert.equal(env[key], undefined, `${id} NONE never inherits ${key}`);
        }
        assert.equal(env.GH_TOKEN, 'work-token', 'an unrelated credential of the work itself stays available');
        assert.equal(env.PATH, '/usr/bin');
    }

    const gemini = harnessPlugin('gemini');
    const native = instanceEnvironment(gemini, { type: 'HARNESS', variant: 'GEMINI', name: 'gemini', authentication: 'NATIVE' }, undefined, base);
    assert.equal(native.GOOGLE_GENAI_USE_GCA, 'true');
    for (const key of ['CLOUD_SHELL', 'GEMINI_CLI_USE_COMPUTE_ADC', 'GEMINI_CLI_AUTH_OVERRIDE', 'GEMINI_DEFAULT_AUTH_TYPE', 'GEMINI_API_KEY', 'GOOGLE_GENAI_USE_VERTEXAI', 'GOOGLE_GEMINI_BASE_URL']) {
        assert.ok(key in native && native[key] === '', `native Gemini receives ${key} empty: neither the engine environment nor the trusted project .env selects compute ADC, Vertex AI or a key`);
    }
    assert.equal(native.GOOGLE_CLOUD_PROJECT, 'billing-project', 'a native Workspace/Code Assist login keeps its Google Cloud project');
    assert.equal(native.GOOGLE_APPLICATION_CREDENTIALS, '/keys/service-account.json');

    const api = instanceEnvironment(gemini, { type: 'HARNESS', variant: 'GEMINI', name: 'gemini-api', authentication: 'API_KEY' }, { name: 'PTBK_GEMINI_API_KEY', source: '.env', value: 'configured-key' }, base);
    assert.equal(api.GEMINI_API_KEY, 'configured-key');
    for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_PROJECT', 'CLOUD_SHELL', 'GEMINI_CLI_AUTH_OVERRIDE']) assert.equal(api[key], '', `an API key instance never sees ${key}`);
    const missing = instanceEnvironment(gemini, { type: 'HARNESS', variant: 'GEMINI', name: 'gemini-api', authentication: 'API_KEY' }, undefined, base);
    assert.ok('GEMINI_API_KEY' in missing && missing.GEMINI_API_KEY === '', 'a missing configured key stays absent even where a project .env has GEMINI_API_KEY');

    const codexNative = instanceEnvironment(harnessPlugin('openai-codex'), { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex', authentication: 'NATIVE' }, undefined, base);
    assert.equal(codexNative.OPENAI_API_KEY, undefined);
    assert.equal('OPENAI_API_KEY' in codexNative, false, 'only adapters that read a workspace .env receive masked values');
    assert.equal(JSON.stringify(base), snapshot, 'the shared environment is never mutated');
});

test('technical fallback eligibility: same endpoint and enabled only, never for an explicit instance; a late failure cannot mark a replacement', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk technical fallback');
    const { env } = await fakeHarness(t, root);
    const tools = [
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-first', authentication: 'NATIVE' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-other-endpoint', authentication: 'API_KEY', apiKey: '${{ env.OTHER_KEY }}', baseUrl: 'https://proxy.example/v1' },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-disabled', authentication: 'API_KEY', apiKey: '${{ env.SECOND_KEY }}', isEnabled: false },
        { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'codex-second', authentication: 'API_KEY', apiKey: '${{ env.SECOND_KEY }}' },
    ];
    const keys = { ...env, OTHER_KEY: 'other', SECOND_KEY: 'second' };
    const pool = new HarnessPool(root, resolveSettings({ file: { tools } }), keys);
    await pool.refresh();
    const selection = { harness: 'openai-codex', tool: 'codex-first', runtime: 'official', sources: { tool: 'first usable OpenAI Codex instance in ptbk.json tools order' } };
    assert.equal(pool.fallbackFor(selection)?.name, 'codex-second', 'the next enabled instance on the same endpoint, skipping another endpoint and a disabled tool');
    assert.equal(pool.fallbackFor({ ...selection, sources: { tool: 'explicit instance (codex-first)' } }), undefined, 'an explicit instance is an account constraint');

    // The failure is recorded against the acquired connection: the earlier instance is skipped until its recheck.
    const acquired = { projectRoot: root, tool: pool.instance('codex-first'), env: pool.environment(pool.instance('codex-first')) };
    pool.markTechnical('codex-first', 'stream disconnected', acquired);
    assert.equal(pool.select('openai-codex', { runtime: 'official' }).name, 'codex-second');
    assert.match(pool.inspectionOf('codex-first').summary, /Technical failure: stream disconnected \(rechecked after/);

    // A late failure of the replaced connection (another account profile now) never marks the replacement.
    const replaced = new HarnessPool(root, resolveSettings({ file: { tools: [{ ...tools[0], accountProfile: 'company' }, tools[3]] } }), keys);
    await replaced.refresh();
    replaced.markTechnical('codex-first', 'late failure of the old profile', acquired);
    assert.doesNotMatch(replaced.inspectionOf('codex-first')?.summary ?? '', /late failure/);
});
