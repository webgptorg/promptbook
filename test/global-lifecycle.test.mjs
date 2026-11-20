import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { PtbkError } from '../dist/common/errors.js';
import { ENGINE_ROOT, ENGINE_VERSION } from '../dist/common/version.js';
import { runGlobalLifecycle } from '../dist/cli/global-lifecycle.js';
import restart from '../dist/cli/commands/restart.js';
import { COMMANDS } from '../dist/cli/registry.js';
import { projectAt } from '../dist/project/workspace.js';
import { knownProjectsDirectory, registerKnownProject } from '../dist/service/known-projects.js';
import { registerEngine } from '../dist/service/discovery.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';
import { initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/** Builds a captured command context without a terminal or implicit project selection. */
function contextFor(command, cwd, env, options = { global: true }) {
    const output = [];
    const terminal = createTerminalProfile({ raw: true, nonInteractive: true, terminalTitle: false });
    return {
        context: {
            path: [command], spec: COMMANDS.find((spec) => spec.name === command), options,
            explicit: new Set(Object.keys(options)), positionals: [], argv: [], cwd, env,
            terminal: { ...terminal, write: (text) => output.push(text), writeError: (text) => output.push(text) },
        },
        output,
    };
}

/** Reads the actual service state through the CLI. */
async function status(project, env) {
    const result = await ptbk(['status', '--path', project, '--json'], { env });
    assert.equal(result.code, 0, result.output);
    return JSON.parse(result.stdout);
}

test('lifecycle scope: help, local selection, empty global scope and conflicting selectors for all four commands', async (t) => {
    const elsewhere = await temporaryDirectory(t, 'ptbk lifecycle cwd');
    const home = await temporaryDirectory(t, 'ptbk lifecycle home');
    const env = { ...process.env, PTBK_HOME: home };
    for (const command of ['restart', 'stop', 'pause', 'resume']) {
        const help = await ptbk([command, '--help', '--raw'], { cwd: elsewhere, env });
        assert.equal(help.code, 0, help.output);
        assert.match(help.stdout, /--global/);
        assert.match(help.stdout, new RegExp(`ptbk ${command} --global`));
        const local = await ptbk([command, '--path', join(elsewhere, 'missing project'), '--raw'], { cwd: elsewhere, env });
        assert.notEqual(local.code, 0, 'the local form resolves the selected directory');
        const global = await ptbk([command, '--global', '--raw'], { cwd: elsewhere, env });
        assert.equal(global.code, 0, global.output);
        assert.match(global.stdout, /no active projects/);
        for (const selector of ['path', 'tasks']) {
            const conflict = await ptbk([command, '--global', `--${selector}`, elsewhere, '--raw'], { cwd: elsewhere, env });
            assert.equal(conflict.code, 2, conflict.output);
            assert.match(conflict.stderr, new RegExp(`--${selector} would select one project`));
        }
    }
    assert.deepEqual(await readdir(elsewhere), [], 'no command initializes the invocation directory');
});

test('global lifecycle runner bounds concurrent attempts, reports unreachable owners, preserves pending/failure status and skips stopped projects', async (t) => {
    const elsewhere = await temporaryDirectory(t, 'ptbk runner cwd');
    const directory = await temporaryDirectory(t, 'ptbk runner targets');
    const env = { ...process.env, PTBK_HOME: join(directory, 'home') };
    const projects = [];
    for (let index = 0; index < 7; index++) {
        const project = projectAt(join(directory, `project ${index}`));
        await mkdir(project.root);
        await registerKnownProject(project, {}, env);
        projects.push(project);
        if (index === 6) continue;
        // A live PID without a readable project record is explicitly unreachable; no socket or fake server is needed.
        await registerEngine({ version: 1, instanceId: `fixture-${index}`, pid: process.pid, mode: 'daemon', projectRoot: project.root, projectName: project.name, engineVersion: ENGINE_VERSION, installation: ENGINE_ROOT, controlAddress: join(directory, `unused-${index}.sock`), startedAt: new Date().toISOString() }, env);
    }
    const captured = contextFor('stop', elsewhere, env);
    const attempted = [];
    let active = 0;
    let peak = 0;
    const code = await runGlobalLifecycle(captured.context, async (local, expected) => {
        attempted.push(local.options.path);
        assert.equal(local.options.global, false);
        assert.equal(local.options.dashboard, false);
        assert.equal(local.terminal.interactive, false);
        assert.equal(local.explicit.has('global'), false);
        assert.ok(expected.startsWith('fixture-'));
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
        if (local.options.path === projects[0].root) throw new PtbkError('Fixture owner failed.', { kind: 'technical' });
        local.terminal.write('Stopping: fixture work is still settling.\n');
        return local.options.path === projects[1].root ? 3 : 0;
    });
    assert.equal(code, 1, 'a failed target takes precedence over pending');
    assert.deepEqual(attempted.sort(), projects.slice(0, 6).map((project) => project.root).sort());
    assert.equal(peak, 4, 'attempts use bounded concurrency');
    assert.match(captured.output.join(''), /4 succeeded, 1 pending, 1 failed/);
    assert.match(captured.output.join(''), /1 stopped or missing project\(s\) skipped/);
    const pending = contextFor('restart', elsewhere, env);
    assert.equal(await runGlobalLifecycle(pending.context, async () => 3), 3);
    const refused = await ptbk(['pause', '--global', '--raw'], { cwd: elsewhere, env });
    assert.equal(refused.code, 1, refused.output);
    assert.match(refused.stdout, /0 succeeded, 0 pending, 6 failed/);
    const stale = contextFor('restart', elsewhere, env, { path: projects[6].root, raw: true });
    await assert.rejects(restart(stale.context, 'an-ended-instance'), /discovered engine stopped/);
    assert.deepEqual(await readdir(projects[6].root), [], 'global restart never launches a target that stopped since discovery');
    assert.deepEqual(await readdir(elsewhere), []);
});

test('global lifecycle: independent projects, local scope, saved restart settings, stopped targets, failures and force stop', async (t) => {
    const first = await initializedProject(t);
    const second = await initializedProject(t);
    const stopped = await initializedProject(t);
    const elsewhere = await temporaryDirectory(t, 'ptbk lifecycle elsewhere');
    const home = await temporaryDirectory(t, 'ptbk shared lifecycle home');
    const env = { ...first.env, PTBK_HOME: home };
    const secondEnv = { ...second.env, PTBK_HOME: home };
    // These engines share host discovery but retain their own launch environments and overrides.
    for (const fixture of [first, second, stopped]) await registerKnownProject(projectAt(fixture.project), {}, env);
    t.after(async () => {
        for (const fixture of [first, second]) await ptbk(['stop', '--force', '--raw', '--path', fixture.project], { env });
    });
    for (const [fixture, launchEnv, pacing] of [[first, env, '2s'], [second, secondEnv, '3s']]) {
        const started = await ptbk(['start', '--paused', '--no-persist', '--no-server', '--wait-between-prompts', pacing, '--raw'], { cwd: fixture.project, env: launchEnv });
        assert.equal(started.code, 0, started.output);
    }
    const before = [await status(first.project, env), await status(second.project, env)];
    const localResume = await ptbk(['resume', '--path', first.project, '--raw'], { cwd: elsewhere, env });
    assert.equal(localResume.code, 0, localResume.output);
    assert.equal((await status(first.project, env)).service.state, 'running');
    assert.equal((await status(second.project, env)).service.state, 'pause', 'local resume does not affect the other project');
    const resumed = await ptbk(['resume', '--global', '--raw'], { cwd: elsewhere, env });
    assert.equal(resumed.code, 0, resumed.output);
    assert.equal((await status(second.project, env)).service.state, 'running');
    const paused = await ptbk(['pause', '--global', '--raw'], { cwd: elsewhere, env });
    assert.equal(paused.code, 0, paused.output);
    for (const fixture of [first, second]) await waitFor(async () => (await status(fixture.project, env)).service.state === 'pause', { message: 'the global pause to settle' });
    assert.match(paused.stdout, /2 succeeded, 0 pending, 0 failed/);

    const launchPath = (fixture) => join(fixture.project, '.ptbk', 'service', 'launch.json');
    const saved = await Promise.all([first, second].map(async (fixture) => JSON.parse(await readFile(launchPath(fixture), 'utf8'))));
    const restarted = await ptbk(['restart', '--global', '--timeout', '30s', '--raw'], { cwd: elsewhere, env });
    assert.equal(restarted.code, 0, restarted.output);
    assert.match(restarted.stdout, /2 succeeded, 0 pending, 0 failed/);
    assert.doesNotMatch(restarted.stdout, /Opening the dashboard/);
    for (const [index, fixture] of [first, second].entries()) {
        const after = await status(fixture.project, env);
        assert.notEqual(after.service.instanceId, before[index].service.instanceId);
        const launch = JSON.parse(await readFile(launchPath(fixture), 'utf8'));
        assert.deepEqual(launch.cli, saved[index].cli, 'each restart keeps its own effective launch settings');
        assert.deepEqual(launch.cliHarnesses, saved[index].cliHarnesses);
        assert.equal(launch.tasksDirectory, saved[index].tasksDirectory);
        assert.equal(launch.persistent, false);
    }
    assert.equal((await status(stopped.project, env)).service.state, 'stopped', 'global restart never starts stopped projects');

    const stop = await ptbk(['stop', '--global', '--timeout', '30s', '--raw'], { cwd: elsewhere, env });
    assert.equal(stop.code, 0, stop.output);
    for (const fixture of [first, second]) assert.equal((await status(fixture.project, env)).service.state, 'stopped');
    // The local form still starts a stopped project. Only it is selected from outside the project directory.
    const localRestart = await ptbk(['restart', '--path', first.project, '--raw'], { cwd: elsewhere, env });
    assert.equal(localRestart.code, 0, localRestart.output);
    assert.notEqual((await status(first.project, env)).service.state, 'stopped');
    assert.equal((await status(second.project, env)).service.state, 'stopped');
    const forced = await ptbk(['stop', '--global', '-F', '--timeout', '10s', '--raw'], { cwd: elsewhere, env });
    assert.equal(forced.code, 0, forced.output);
    assert.match(forced.stdout, /Force-stopped/);
    assert.equal((await status(first.project, env)).service.state, 'stopped');
    assert.deepEqual(await readdir(elsewhere), [], 'global operations never touch the launch directory');
});

test('global lifecycle reports incomplete discovery as a failure even with no verified active projects', async (t) => {
    const elsewhere = await temporaryDirectory(t, 'ptbk discovery elsewhere');
    const home = await temporaryDirectory(t, 'ptbk damaged discovery home');
    const env = { ...process.env, PTBK_HOME: home };
    const registry = knownProjectsDirectory(env);
    await mkdir(dirname(registry), { recursive: true });
    await writeFile(registry, 'not a directory');
    const result = await ptbk(['pause', '--global', '--raw'], { cwd: elsewhere, env });
    assert.equal(result.code, 1, result.output);
    assert.match(result.stderr, /Discovery incomplete/);
    assert.deepEqual(await readdir(elsewhere), []);
});
