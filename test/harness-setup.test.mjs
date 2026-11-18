import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { functionalCheck } from '../dist/harness/preparation.js';
import { serviceReadinessProblem, updateHarness } from '../dist/harness/maintenance.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { persistentServiceEnvironment } from '../dist/service/records.js';
import { fakeHarness, ptbk, temporaryDirectory } from './helpers.mjs';

/** Isolated native account and preparation evidence; no real login or provider request. */
async function fixture(t, extra = {}) {
    const root = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, root);
    const log = join(root, 'preparation.jsonl');
    Object.assign(env, { FAKE_CODEX_PREPARATION_LOG: log, ...extra });
    const plugin = harnessPlugin('openai-codex');
    const context = { projectRoot: root, env };
    return {
        root, env, log, plugin, context,
        call: { plugin, env, inspection: await plugin.inspect(context), model: 'gpt-5.5', modelCandidates: ['gpt-5.5', 'available-codex'] },
        calls: async () => (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse),
    };
}

test('native setup verifies a catalog alternative after the reported ChatGPT model rejection', async (t) => {
    const { call, calls } = await fixture(t, { FAKE_CODEX_REJECT_MODELS: '["gpt-5.5"]' });
    const check = await functionalCheck(call);
    assert.equal(check.ok, true, check.summary);
    assert.equal(check.model, 'available-codex', 'retain the verified model even when Codex emits no model event');
    assert.match(check.summary, /model-access rejection/);
    assert.deepEqual((await calls()).map(({ args }) => args[args.indexOf('--model') + 1]), ['gpt-5.5', 'available-codex']);
});

test('model discovery prefers the installed client default and excludes hidden catalog entries', async (t) => {
    const { plugin, context } = await fixture(t, { FAKE_CODEX_MODELS: JSON.stringify([{ model: 'first' }, { model: 'hidden', hidden: true, isDefault: true }, { model: 'recommended', isDefault: true }]) });
    assert.deepEqual(await plugin.listModels(context), ['recommended', 'first']);
});

test('setup never changes explicit, API or local models, and native fallback is bounded', async (t) => {
    for (const mode of ['explicit', 'api', 'local', 'bounded']) {
        const { call, calls } = await fixture(t, { FAKE_CODEX_REJECT_MODELS: '["gpt-5.5","two","three","four"]' });
        const selected = {
            ...call,
            modelCandidates: mode === 'explicit' ? undefined : mode === 'bounded' ? ['two', 'three', 'four'] : call.modelCandidates,
            inspection: { ...call.inspection, authentication: mode === 'api' ? 'api' : 'account' },
            // A model-access rejection of a local request must never try a hosted catalog model.
            ...(mode === 'local' ? { localRoute: { runtime: 'OLLAMA', runtimeTool: 'ollama', connection: 'local', resourceKey: 'ollama|http://localhost:11434', protocol: 'openai', protocolUrl: 'http://localhost:11434/v1', compatibilityToken: 'local' } } : {}),
        };
        const check = await functionalCheck(selected);
        assert.equal(check.ok, false, mode);
        assert.equal((await calls()).length, mode === 'bounded' ? 3 : 1, mode);
    }
});

test('quota, authentication, sandbox and network errors never trigger a model retry', async (t) => {
    for (const error of ['usage limit reached', 'Not logged in', 'sandbox: landlock is not supported', 'stream disconnected']) {
        const { call, calls } = await fixture(t, { FAKE_CODEX_CHECK_ERROR: error });
        const check = await functionalCheck(call);
        assert.equal(check.ok, false);
        assert.match(check.summary, new RegExp(error));
        assert.equal((await calls()).length, 1, error);
    }
});

test('init uses the verified replacement for naming and the saved Router MODEL', async (t) => {
    const { root, env, calls } = await fixture(t, { FAKE_CODEX_MODELS: '[{"model":"gpt-5.5"},{"model":"available-codex"}]', FAKE_CODEX_REJECT_MODELS: '["gpt-5.5"]' });
    const project = join(root, 'project');
    const result = await ptbk(['init', '--path', project, '--non-interactive', '--installation', 'global', '--harness', 'openai-codex', '--intent', 'NAME_ME:Working Codex Project', '--no-start', '--raw'], { cwd: root, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Answered a real request.*available-codex/);
    const evidence = await calls();
    assert.deepEqual(evidence.map(({ kind }) => kind), ['check', 'check', 'name']);
    assert.deepEqual(evidence.map(({ args }) => args[args.indexOf('--model') + 1]), ['gpt-5.5', 'available-codex', 'available-codex']);
    assert.match(await readFile(join(project, 'agents', '.core', 'router.book'), 'utf8'), /MODEL harness=OPENAI_CODEX model=available-codex /);
});

test('an unreadable Codex account store is a diagnostic failure, not a signed-out account', async (t) => {
    const { plugin, context } = await fixture(t, { FAKE_CODEX_STATUS_ERROR: 'Keychain access failed: permission denied' });
    const inspection = await plugin.inspect(context);
    assert.equal(inspection.usable, false);
    assert.equal(inspection.authenticated, 'unknown');
    assert.equal(inspection.problem, 'error');
    const problem = await serviceReadinessProblem(plugin, context);
    assert.match(problem.summary, /Keychain access failed/);
    assert.match(problem.nextAction, /permissions/);
    assert.doesNotMatch(problem.summary, /signed out|not logged in/);
});

/** Writes a fixture command whose interpreter is independent of the discovery PATH. */
async function executable(path, source) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(`${path}.mjs`, source);
    await writeFile(path, `#!/bin/sh\nexec "${process.execPath}" "${path}.mjs" "$@"\n`);
    await chmod(path, 0o755);
}

test('service readiness retains OS account and temporary locations without persisting credentials', { skip: process.platform === 'win32' }, async (t) => {
    const root = await temporaryDirectory(t);
    const bin = join(root, 'bin');
    await executable(join(bin, 'codex'), `
        if (process.argv.includes('--version')) console.log('codex-cli 1.2.3');
        else if (process.env.USER === 'fixture-user' && process.env.LOGNAME === 'fixture-user' && process.env.TMPDIR === ${JSON.stringify(root)}) console.error('Logged in using ChatGPT');
        else { console.error('Not logged in'); process.exitCode = 1; }
    `);
    const env = persistentServiceEnvironment({ PATH: bin, HOME: root, USER: 'fixture-user', LOGNAME: 'fixture-user', TMPDIR: root, OPENAI_API_KEY: 'fixture-api-secret', CLAUDE_CODE_OAUTH_TOKEN: 'fixture-native-secret', PTBK_PROMPT_TOKEN: 'fixture-ui-secret' });
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
    assert.equal(env.PTBK_PROMPT_TOKEN, undefined);
    assert.equal(await serviceReadinessProblem(harnessPlugin('openai-codex'), { projectRoot: root, env }), undefined);
});

/** A package-manager fixture records maintenance and supplies only a fake version. */
async function maintenance(t, kind) {
    const root = await temporaryDirectory(t);
    const bin = kind === 'standalone' ? join(root, 'different-node', 'bin') : join(root, 'bin');
    const log = join(root, 'maintenance.jsonl');
    const version = join(root, 'version');
    await writeFile(version, '1.0.0');
    const prefix = join(root, 'original prefix');
    const packagePath = join(prefix, 'lib', 'node_modules', '@openai', 'codex');
    const target = kind === 'npm' ? join(packagePath, 'bin', 'codex.js') : kind === 'brew' ? join(root, 'brew', 'Caskroom', 'codex', '1.0.0', 'codex') : join(root, 'standalone', 'codex');
    await executable(target, "console.log('fake executable');");
    if (kind === 'npm') await writeFile(join(packagePath, 'package.json'), '{"name":"@openai/codex"}');
    await mkdir(bin, { recursive: true });
    const command = join(bin, 'codex');
    await symlink(target, command);
    for (const manager of ['npm', 'brew']) await executable(manager === 'brew' ? join(root, 'brew', 'bin', 'brew') : join(bin, manager), `
        import { appendFileSync, writeFileSync } from 'node:fs';
        const args = process.argv.slice(2);
        appendFileSync(${JSON.stringify(log)}, JSON.stringify({ manager: ${JSON.stringify(manager)}, args }) + '\\n');
        if (args[0] === 'root') console.log(${JSON.stringify(join(root, 'different-node', 'lib', 'node_modules'))});
        else if (args[0] === 'list') console.log('codex 1.0.0');
        else writeFileSync(${JSON.stringify(version)}, '2.0.0');
    `);
    const inspection = async () => ({ id: 'openai-codex', installed: true, usable: true, authenticated: true, authentication: 'account', executablePath: command, version: await readFile(version, 'utf8'), summary: 'Ready.' });
    const plugin = { ...harnessPlugin('openai-codex'), inspect: inspection };
    return { plugin, prefix, log, context: { projectRoot: root, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, PTBK_HOME: join(root, 'ptbk') } }, inspection: await inspection() };
}

test('Codex updates the owning npm prefix after Node changes, or its actual Homebrew cask', { skip: process.platform === 'win32' }, async (t) => {
    for (const kind of ['npm', 'brew']) {
        const { plugin, context, inspection, prefix, log } = await maintenance(t, kind);
        const result = await updateHarness(plugin, inspection, context);
        assert.equal(result.outcome, 'updated', result.diagnostic);
        assert.equal(result.version, '2.0.0');
        const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
        const update = calls.find(({ args }) => args[0] === 'install' || args[0] === 'upgrade');
        assert.deepEqual(update, kind === 'npm' ? { manager: 'npm', args: ['install', '--global', '--prefix', prefix, '@openai/codex@latest'] } : { manager: 'brew', args: ['upgrade', '--cask', 'codex'] });
    }
});

test('a standalone executable is never overwritten or falsely reported as updated', { skip: process.platform === 'win32' }, async (t) => {
    const { plugin, context, inspection, log } = await maintenance(t, 'standalone');
    const result = await updateHarness(plugin, inspection, context);
    assert.equal(result.outcome, 'unsupported');
    assert.match(result.diagnostic, /original installer/);
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(calls.every(({ args }) => args[0] === 'root'));
});

test('a successful updater without a verified installed version is a failure', { skip: process.platform === 'win32' }, async (t) => {
    const { plugin, context, inspection } = await maintenance(t, 'npm');
    plugin.inspect = async () => ({ ...inspection, version: undefined, summary: 'Version probe failed.' });
    const result = await updateHarness(plugin, inspection, context);
    assert.equal(result.outcome, 'failed');
    assert.match(result.diagnostic, /could not be verified/);
});
