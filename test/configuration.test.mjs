import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readProjectConfiguration, ensureProjectConfiguration } from '../dist/coder/configuration.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';

/** Spawn isolated invocations so environment defaults and CLI precedence cannot leak between tests. */
const execute = promisify(execFile);
/** Test the installed command over disposable external projects. */
const executable = fileURLToPath(new URL('../bin/ptbk.js', import.meta.url));

/** Create only the project directory; read-only configuration must never create runtime files. */
async function fixture(t) {
    const project = await mkdtemp(join(tmpdir(), 'ptbk configuration '));
    t.after(() => rm(project, { recursive: true, force: true }));
    return project;
}

test('partial project defaults retain false, empty, duration and relative path values', async t => {
    const project = await fixture(t);
    const document = { routing: { model: '', context: '', agent: './agents/developer.book' }, execution: { autoPull: false, check: '', waitAfterError: 0 }, browser: { profile: './shared-profile', mode: 'headful' }, updates: { harnesses: false }, harnesses: [] };
    const original = `${JSON.stringify(document, null, 2)}\n`;
    await writeFile(join(project, 'ptbk.json'), original);
    const configuration = await readProjectConfiguration(project);
    assert.equal(configuration.values.model, '');
    assert.equal(configuration.values.context, '');
    assert.equal(configuration.values.check, '');
    assert.equal(configuration.values['auto-pull'], false);
    assert.equal(configuration.values['wait-after-error'], '0ms');
    assert.equal(configuration.values.agent, join(project, 'agents', 'developer.book'));
    assert.equal(configuration.values['browser-profile'], join(project, 'shared-profile'));
    assert.equal(configuration.autoUpdateHarnesses, false);
    assert.deepEqual(configuration.enabledHarnesses, []);
    assert.deepEqual(await ensureProjectConfiguration(await resolveWorkspace({ path: project })), []);
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), original);
    assert.deepEqual(await readdir(project), ['ptbk.json']);
});

test('configured harness defaults are project choices and enabled catalogs remain explicit', async t => {
    const project = await fixture(t);
    await writeFile(join(project, 'ptbk.json'), JSON.stringify({ harnesses: { 'openai-codex': { enabled: true, model: 'configured-model', thinkingLevel: 'high' }, 'claude-code': false }, routing: { harness: 'openai-codex' } }));
    const configuration = await readProjectConfiguration(project);
    assert.deepEqual(configuration.enabledHarnesses, ['openai-codex']);
    assert.equal(configuration.values.model, 'configured-model');
    assert.equal(configuration.values['thinking-level'], 'high');
    assert.match(configuration.sources.model, /harnesses.openai-codex.model$/);
});

test('saved settings override legacy environment; explicit flags override saved settings without writes', async t => {
    const project = await fixture(t);
    await mkdir(join(project, 'tasks'));
    await writeFile(join(project, 'tasks', 'work.book'), 'TASK Configured route\n\nTASK AGENT @Expert\nTASK HARNESS openai-codex\nTASK MODEL saved-model\nTASK PRIORITY 2\n\nWork.\n');
    const original = JSON.stringify({ routing: { harness: 'openai-codex', model: 'saved-model' }, execution: { minPriority: 1 } });
    await writeFile(join(project, 'ptbk.json'), original);
    const env = { ...process.env, PTBK_HARNESS: 'claude-code', PTBK_MODEL: 'environment-model' };
    const call = flags => execute(process.execPath, [executable, 'list', '--json', '--path', project, ...flags], { cwd: project, env });
    const saved = JSON.parse((await call([])).stdout);
    assert.equal(saved.tasks[0].kind, 'ready');
    const temporary = JSON.parse((await call(['--model', 'temporary-model'])).stdout);
    assert.equal(temporary.tasks[0].kind, 'filtered');
    assert.match(temporary.tasks[0].reason, /model/i);
    const filtered = JSON.parse((await call(['--min-priority', '3'])).stdout);
    assert.equal(filtered.tasks[0].kind, 'filtered');
    const disabled = await execute(process.execPath, [executable, 'run', '--dry-run', '--json', '--path', project, '--auto-pull=false', '--min-priority', '3'], { cwd: project, env });
    assert.equal(JSON.parse(disabled.stdout).tasks[0].kind, 'filtered');
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), original);
    assert.deepEqual((await readdir(project)).sort(), ['ptbk.json', 'tasks']);
});

test('a child never inherits ancestor configuration; command paths resolve from invocation', async t => {
    const project = await fixture(t);
    const child = join(project, 'child');
    await mkdir(child);
    await writeFile(join(project, 'ptbk.json'), '{"routing":{"harness":"invalid-parent-harness"}}');
    assert.equal((await readProjectConfiguration(child)).exists, false);
    await mkdir(join(child, 'custom'));
    await writeFile(join(child, 'custom', 'work.book'), 'TASK Child task\n\nWork.\n');
    const result = await execute(process.execPath, [executable, 'list', '--json', '--path', 'child', '--tasks', 'child/custom'], { cwd: project, env: { ...process.env, PTBK_HARNESS: '', PTBK_MODEL: '' } });
    assert.equal(JSON.parse(result.stdout).tasks[0].title, 'Child task');
    assert.equal(resolve(project, 'child/custom'), join(child, 'custom'));
});

test('invalid controls and stored secrets fail with a location before read-only mutation', async t => {
    const project = await fixture(t);
    for (const [document, pattern] of [
        [{ execution: { autoPull: 'false' } }, /execution.autoPull/],
        [{ browser: { mode: 'invalid' } }, /browser.mode/],
        [{ harnesses: ['unknown-harness'] }, /harnesses.unknown-harness/],
        [{ harnesses: { 'openai-codex': { apiKey: 'private-value' } } }, /credential reference/],
        [{ unsupported: true }, /unsupported setting/],
    ]) {
        await writeFile(join(project, 'ptbk.json'), JSON.stringify(document));
        await assert.rejects(readProjectConfiguration(project), pattern);
        await assert.rejects(execute(process.execPath, [executable, 'list', '--path', project]), error => {
            assert.equal(error.code, 2); assert.match(error.stderr, pattern); assert.doesNotMatch(error.stderr, /private-value/); return true;
        });
        assert.deepEqual(await readdir(project), ['ptbk.json']);
    }
});

test('bare, help and about expose the invoked version and bypass configuration or setup', async t => {
    const project = await fixture(t);
    await writeFile(join(project, 'ptbk.json'), 'invalid configuration');
    const call = args => execute(process.execPath, [executable, ...args], { cwd: project, timeout: 5_000 });
    const version = (await call(['--version'])).stdout.trim();
    const bare = (await call([])).stdout;
    assert.equal(bare, (await call(['--help'])).stdout);
    assert.match(bare, new RegExp(version.replaceAll('.', '\\.')));
    assert.doesNotMatch(bare, /Harness registry|"executable"|Start the agenda.*\?/);
    assert.match((await call(['about'])).stdout, new RegExp(version.replaceAll('.', '\\.')));
    assert.deepEqual(await readdir(project), ['ptbk.json']);
});
