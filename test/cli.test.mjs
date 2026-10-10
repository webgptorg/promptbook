import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import test from 'node:test';

/** The executable path is installation-relative, while cwd is always external. */
const executable = path.resolve('bin/ptbk.js');
/** CLI child processes use argv and a bounded wall clock rather than shell parsing. */
const run = promisify(execFile);

/** Create an external fixture containing a mixed, future and legacy queue. */
async function fixture(t) {
    const project = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ptbk cli project ')));
    t.after(() => rm(project, { recursive: true, force: true }));
    await mkdir(path.join(project, 'prompts'));
    await mkdir(path.join(project, 'tasks'));
    await writeFile(path.join(project, 'prompts', 'legacy.md'), '[ ] ! \`gpt\`\nLegacy work');
    await writeFile(path.join(project, 'tasks', 'future.book'), 'Future work\n\nTASK\nMETA ID future\nSTATUS todo\nPRIORITY 9\nAFTER 2099-01-01T00:00Z\n\nPROMPT\nScheduled work\n');
    return project;
}

/** Preserve the child exit code even for invalid configuration. */
async function invoke(project, arguments_) {
    const env = { ...process.env };
    delete env.PTBK_HARNESS;
    delete env.PTBK_MODEL;
    delete env.PTBK_THINKING_LEVEL;
    try { return { code: 0, ...await run(process.execPath, [executable, ...arguments_], { cwd: project, env, timeout: 10000 }) }; }
    catch (error) { return { code: error.code, stdout: error.stdout, stderr: error.stderr }; }
}

test('installed executable resolves its own version/help from an external working directory', async (t) => {
    const project = await fixture(t);
    const manifest = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
    const version = await invoke(project, ['--version']);
    assert.equal(version.code, 0);
    assert.equal(version.stdout.trim(), manifest.version);
    const help = await invoke(project, ['--help']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /ptbk <command>/);
    assert.match(help.stdout, /openai-codex/);
    assert.match(help.stdout, /migrate/);
    assert.doesNotMatch(help.stdout, /ptbk coder/);
    const legacy = await invoke(project, ['coder', 'run', '--dry-run']);
    assert.equal(legacy.code, 2);
    assert.match(legacy.stderr, /Use ptbk <command>/);
});

test('CLI list and dry-run work without Git, harness, default Book or runtime writes', async (t) => {
    const project = await fixture(t);
    const before = await readdir(project);
    const list = await invoke(project, ['list', '--json']);
    assert.equal(list.code, 0, list.stderr);
    const state = JSON.parse(list.stdout);
    assert.equal(state.tasks.length, 2);
    assert.equal(state.tasks[0].kind, 'waiting-until');
    assert.equal(state.tasks[1].kind, 'filtered');
    const preview = await invoke(project, ['run', '--dry-run', '--json', '--harness', 'openai-codex', '--model', 'gpt-fixture']);
    assert.equal(preview.code, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).tasks[1].kind, 'ready');
    assert.deepEqual(await readdir(project), before);
    await assert.rejects(readFile(path.join(project, '.git')));
    await assert.rejects(readFile(path.join(project, '.promptbook', 'ptbk-coder', 'ledger.json')));
});

test('CLI detects unsupported and contradictory flags before filesystem mutation', async (t) => {
    const project = await fixture(t);
    for (const [arguments_, expected] of [
        [['list', '--nonsense'], /Unsupported option/],
        [['run', '--test', 'npm test'], /replaced by --check/],
        [['run', '--test-before', 'yes'], /replaced by --check-before/],
        [['list', '--min-priority', '3', '--max-priority', '1'], /Minimum priority/],
        [['list', '--priority', '1', '--min-priority', '2'], /conflicts/],
        [['run', '--no-auto', '--no-questions'], /cannot be combined/],
        [['run', '--no-commit'], /requires --git-changes ignore/],
        [['list', '--check', 'npm test'], /unsupported for list/],
        [['server', '--dry-run'], /does not support --dry-run/],
        [['run', '--thinking-level', 'extreme'], /thinking-level/],
        [['list', '--max-priority', '1.5'], /nonnegative integer/],
    ]) {
        const result = await invoke(project, arguments_);
        assert.equal(result.code, 2, `${arguments_.join(' ')}: ${result.stderr}`);
        assert.match(result.stderr, expected);
    }
    assert.deepEqual(await readdir(project), ['prompts', 'tasks']);
});

test('CLI path and custom absolute source options work with spaces and respect explicit missing sources', async (t) => {
    const project = await fixture(t);
    const external = await fixture(t);
    await mkdir(path.join(project, 'custom tasks'));
    await writeFile(path.join(project, 'custom tasks', 'custom.book'), 'Custom\nTASK\nMETA ID custom\nSTATUS todo\nPROMPT\nWork\n');
    const result = await invoke(external, ['list', '--path', project, '--tasks', path.join(project, 'custom tasks'), '--json']);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).tasks.map((task) => task.id).filter((id) => !id.startsWith('markdown-')), ['custom']);
    const missing = await invoke(project, ['list', '--tasks', 'missing']);
    assert.equal(missing.code, 2);
    assert.match(missing.stderr, /Explicit task source/);
    const outside = await invoke(project, ['list', '--tasks', path.join(external, 'tasks')]);
    assert.equal(outside.code, 2);
    assert.match(outside.stderr, /escapes/);
});

test('CLI explicit named agent routing matches the Book title without compiling inheritance', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents'));
    await writeFile(path.join(project, 'agents', 'developer.book'), 'Developer\nFROM {https://should-not-be-requested.invalid/agent.book}\nRULE Local fixture\n');
    await writeFile(path.join(project, 'tasks', 'agent.book'), 'Agent task\nTASK\nMETA ID agent-task\nSTATUS todo\nAGENT Developer\nPROMPT\nWork\n');
    const result = await invoke(project, ['list', '--json', '--agent', 'Developer']);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).tasks.find((task) => task.id === 'agent-task').kind, 'ready');
    assert.deepEqual(await readdir(project), ['agents', 'prompts', 'tasks']);
});

test('CLI migration preview leaves bytes and directories unchanged and init alias needs no questions', async (t) => {
    const project = await fixture(t);
    const original = await readFile(path.join(project, 'prompts', 'legacy.md'), 'utf8');
    const preview = await invoke(project, ['migrate', '--dry-run', '--tasks', 'new books']);
    assert.equal(preview.code, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).plan.length, 1);
    assert.equal(await readFile(path.join(project, 'prompts', 'legacy.md'), 'utf8'), original);
    await assert.rejects(readdir(path.join(project, 'new books')));
    const init = await invoke(project, ['init', '--no-questions']);
    assert.equal(init.code, 0, init.stderr);
    const repeated = await invoke(project, ['initialize', '--no-questions']);
    assert.equal(repeated.code, 0, repeated.stderr);
    assert.equal(repeated.stdout, '');
});
