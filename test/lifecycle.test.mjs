import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { executionContextView } from '../dist/engine/agenda.js';
import { BIN, findGenerated, git, initializedProject, ptbk, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Status snapshot of a project as JSON.
 */
async function status(project, env) {
    const result = await ptbk(['status', '--json'], { cwd: project, env });
    return JSON.parse(result.stdout);
}

/**
 * Executed fake-harness turns of tasks whose title starts with a prefix.
 */
async function turnsOf(log, prefix) {
    const text = await readFile(log, 'utf8').catch(() => '');
    return text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((entry) => entry.title.startsWith(prefix) && !entry.assignment && !entry.learning && !entry.chat);
}

test('execution details distinguish reported, requested, automatic and not-applicable settings in harness terms', () => {
    const codex = executionContextView({ role: 'task', agent: 'Developer', harness: 'openai-codex', thinkingLevel: 'high', state: 'active' });
    assert.equal(codex.model.status, 'automatic', 'no model requested or reported: the harness default, never a guessed name');
    assert.equal(codex.thinkingLevel.status, 'requested');
    assert.match(codex.thinkingLevel.term, /reasoning effort/, 'the harness’s own terminology');
    const reported = executionContextView({ role: 'task', agent: 'Developer', harness: 'openai-codex', model: 'gpt-x', modelReported: true, state: 'active' });
    assert.deepEqual([reported.model.status, reported.model.value, reported.thinkingLevel.status], ['reported', 'gpt-x', 'automatic']);
    const gemini = executionContextView({ role: 'task', agent: 'Developer', harness: 'gemini', state: 'finished' });
    assert.equal(gemini.thinkingLevel.status, 'not-applicable', 'a harness without the setting is not shown as unknown');
    const unknown = executionContextView({ role: 'task', agent: 'Developer', harness: 'retired-harness', state: 'finished' });
    assert.deepEqual([unknown.model.status, unknown.thinkingLevel.status], ['unknown', 'unknown']);
});

test('lifecycle: pause drains the current task without a next claim; resume continues; graceful stop releases the owner', async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '7000' };
    // One slot serializes the work, so the second task can only start after the pause (never alongside the first).
    const configPath = join(project, 'ptbk.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.execution = { ...config.execution, maxConcurrentWork: 1 };
    await writeFile(configPath, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Serialize work', '--', 'ptbk.json']);
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Next work', '--agent', 'Developer', '--priority', '8', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const active = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.current?.taskTitle.startsWith('Slow work') && snapshot.current.phase === 'executing' ? snapshot : undefined;
    }, { message: 'the slow task to execute' });
    assert.equal(active.service.state, 'running');
    assert.equal(active.execution.status, 'active');
    assert.equal(active.execution.agent.name, 'Developer');
    assert.equal(active.execution.contexts[0].harness.id, 'openai-codex');
    assert.ok(['automatic', 'requested', 'reported'].includes(active.execution.contexts[0].model.status));
    assert.equal(active.browser.source, 'MANAGED_GLOBAL', 'the effective browser profile is inspectable');
    assert.equal(active.browser.name, 'project-browser', 'the browser is a named tool');
    assert.equal(active.browser.state, 'not-started', 'an unused browser is not reported as running');

    const paused = await ptbk(['pause', '--raw'], { cwd: project, env });
    assert.equal(paused.code, 0, paused.output);
    assert.match(paused.stdout, /^Pause pending/, paused.output);
    const pausing = await status(project, env);
    assert.equal(pausing.service.state, 'pausing');
    assert.equal(pausing.service.lifecycle.intent, 'pause');
    assert.equal(pausing.service.lifecycle.draining, true);
    await waitFor(async () => (await status(project, env)).service.state === 'pause', { message: 'pausing to settle into pause' });
    assert.ok(findGenerated(await subjects(project), 'Slow work SLOW_WORK', 'ptbk: '), 'the current task finished normally');
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(findGenerated(await subjects(project), 'Next work', 'ptbk: '), undefined, 'no next task is claimed while paused');
    assert.equal((await status(project, env)).current, undefined);
    const again = await ptbk(['pause', '--raw'], { cwd: project, env });
    assert.match(again.stdout, /Already paused/, 'repeating pause is idempotent');

    const resumed = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.equal(resumed.code, 0, resumed.output);
    assert.equal((await status(project, env)).service.state, 'running');
    await waitFor(async () => findGenerated(await subjects(project), 'Next work', 'ptbk: '), { message: 'work to continue after resume' });
    assert.equal((await turnsOf(log, 'Slow work')).length, 1, 'draining never replays the task');

    const stopped = await ptbk(['stop', '--raw'], { cwd: project, env });
    assert.equal(stopped.code, 0, stopped.output);
    assert.match(stopped.stdout, /^Stopped/, stopped.output);
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')), 'the owner removed its own lock');
    assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, true);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'runtime controls create no commits and leave a clean tree');
});

test('lifecycle: a pending stop can be cancelled; replacing it with pause needs confirmation, never a hidden prompt', async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '7000' };
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(async () => (await status(project, env)).current?.taskTitle.startsWith('Slow work'), { message: 'the slow task to execute' });
    const pending = await ptbk(['stop', '--timeout', '1s', '--raw'], { cwd: project, env });
    assert.equal(pending.code, 3, pending.output);
    assert.match(pending.stdout, /^Stopping/, 'an accepted stop is not reported as completed');
    const stopping = await status(project, env);
    assert.equal(stopping.service.state, 'stopping');
    assert.equal(stopping.service.lifecycle.cancellable, true);
    const conflict = await ptbk(['pause', '--raw', '--non-interactive'], { cwd: project, env });
    assert.notEqual(conflict.code, 0, 'stop-to-pause replacement requires explicit confirmation');
    assert.match(conflict.output, /stop is pending/);
    assert.equal((await status(project, env)).service.state, 'stopping', 'nothing changed');
    const cancelled = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.equal(cancelled.code, 0, cancelled.output);
    assert.match(cancelled.stdout, /Cancelled the pending stop/);
    assert.equal((await status(project, env)).service.state, 'running');
    await waitFor(async () => findGenerated(await subjects(project), 'Slow work SLOW_WORK', 'ptbk: '), { message: 'the task to finish' });
    assert.equal((await status(project, env)).service.state, 'running', 'the cancelled stop did not take effect');
    assert.equal((await turnsOf(log, 'Slow work')).length, 1, 'cancellation does not replay the task');
    assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, false, 'no permanent-stop setting is left behind');
    const restarted = await ptbk(['restart', '--raw'], { cwd: project, env });
    assert.equal(restarted.code, 0, restarted.output);
    assert.match(restarted.stdout, /^Restarted/, restarted.output);
    const after = await status(project, env);
    assert.equal(after.service.state, 'running');
    assert.notEqual(after.service.instanceId, stopping.service.instanceId, 'exactly one replacement owns the project');
    const forced = await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    assert.match(forced.stdout, /^Force-stopped/, forced.output);
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')));
});

test('Chatter: initialized with every other role as TEAM, default partner of new chats, consults specialists without a task', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const chatter = await readFile(join(project, 'agents', '.core', 'chatter.book'), 'utf8');
    assert.match(chatter, /^AGENT Chatter\n/);
    const team = /^TEAM (.*)$/m.exec(chatter)[1];
    for (const role of ['@Developer', '@Planner', '@Lawyer', '@Copywriter', '@Adam', '@Router', '@Tasker', '@Teacher', '@Fixer', '@Expert']) assert.ok(team.includes(role), `${role} is a teammate: ${team}`);
    assert.doesNotMatch(team, /@Chatter/, 'Chatter never consults itself');
    const before = (await subjects(project)).length;
    const asked = await ptbk(['chat', 'How should we start? CONSULT_TEAM', '--raw'], { cwd: project, env });
    assert.equal(asked.code, 0, asked.output);
    assert.match(asked.stdout, /Developer advises: Fixture advice/, asked.output);
    const chats = JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout);
    const human = chats.find((chat) => chat.humanFacing);
    assert.equal(human.agent, '@Chatter', 'a new chat without --agent goes to Chatter');
    const consultation = chats.find((chat) => !chat.humanFacing);
    assert.ok(consultation, 'the specialist advice is an internal two-agent chat');
    assert.deepEqual([...consultation.members].sort(), ['@Chatter', '@Developer']);
    assert.ok(consultation.links.some((link) => link.includes(human.name)), 'linked to the originating conversation');
    const history = await subjects(project);
    assert.ok(history.includes(`ptbk: Chat - ${consultation.name}`), 'a conversation-scoped consultation has its own scoped commit');
    assert.ok(!history.slice(0, history.length - before).some((subject) => /^ptbk: (?!Chat - |Chat routing - )/.test(subject)), 'no task was created or executed (only chat messages and the chat routing)');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    await writeFile(join(project, 'agents', '.core', 'chatter.book'), `${chatter}RULE Answer in one paragraph.\n`);
    await git(project, ['commit', '-qam', 'Customize Chatter']);
    const reinit = await ptbk(['init', '--non-interactive', '--no-start', '--raw'], { cwd: project, env });
    assert.ok([0, 3].includes(reinit.code), reinit.output);
    assert.match(await readFile(join(project, 'agents', '.core', 'chatter.book'), 'utf8'), /RULE Answer in one paragraph\./, 'reinit preserves a customized Chatter');
});

test('global dashboard: works outside any project, keeps stopped known projects, notices later starts, and --path conflicts', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const elsewhere = await temporaryDirectory(t, 'ptbk elsewhere');
    const conflict = await ptbk(['dashboard', '--global', '--path', project, '--raw'], { cwd: elsewhere, env });
    assert.equal(conflict.code, 2, conflict.output);
    const watch = (watchEnv) => {
        const child = spawn(process.execPath, [BIN, 'dashboard', '--global', '--raw'], { cwd: elsewhere, env: watchEnv, stdio: ['ignore', 'pipe', 'pipe'] });
        t.after(() => child.kill('SIGKILL'));
        const view = { child, output: '' };
        child.stdout.setEncoding('utf8').on('data', (chunk) => (view.output += chunk));
        child.stderr.setEncoding('utf8').on('data', (chunk) => (view.output += chunk));
        return view;
    };
    const empty = watch({ ...env, PTBK_HOME: join(elsewhere, 'empty home') });
    await waitFor(() => /0 known, 0 active engines/.test(empty.output) && /No known projects yet; still watching/.test(empty.output), { message: 'the empty global view' });
    assert.equal(empty.child.exitCode, null, 'zero projects is a usable, continuous view');
    empty.child.kill('SIGINT');

    const view = watch(env);
    await waitFor(() => /1 known, 0 active engines/.test(view.output) && /my project \[stopped\] · /.test(view.output), { message: 'the initialized project as a stopped known row' });
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(() => /~ my project \[running\] ptbk .* · daemon · PID \d+/.test(view.output), { message: 'the started engine to appear' });
    const { removeStoppedProject, startKnownProject } = await import('../dist/service/global-controls.js');
    const { readKnownProjects } = await import('../dist/service/known-projects.js');
    const target = { projectRoot: project, projectName: 'my project' };
    const refused = await removeStoppedProject(target, env);
    assert.equal(refused.status, 'not-applicable', 'a live project cannot be removed');
    assert.match(refused.message, /Stop it first/);
    assert.equal((await status(project, env)).service.state, 'running', 'removal never stops an engine');
    await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    await waitFor(() => /~ my project \[stopped\] · .*last run \(historical\): ptbk \S+ daemon, ended .*\(force-stopped\)/.test(view.output), { message: 'the stopped engine to stay as a stopped row with historical data' });
    assert.doesNotMatch(view.output.split('[stopped]').pop(), /PID \d+/, 'a stopped row shows no live PID');

    const started = await startKnownProject(target, env);
    assert.equal(started.status, 'completed', started.message);
    const relaunched = await status(project, env);
    assert.equal(relaunched.service.state, 'running', 'an explicit Start uses the ordinary launcher');
    assert.equal(relaunched.connection.local.state, 'ready', 'the local HTTP service is restored');
    assert.deepEqual(Object.keys(relaunched.connection), ['local']);
    assert.equal((await startKnownProject(target, env)).status, 'unchanged', 'Start leaves a live engine unchanged');
    await ptbk(['stop', '--raw'], { cwd: project, env });

    const removed = await removeStoppedProject(target, env);
    assert.equal(removed.status, 'completed', removed.message);
    await waitFor(() => /- my project \[forgotten\]/.test(view.output), { message: 'the removed entry to disappear' });
    assert.equal((await readKnownProjects(env)).entries.length, 0);
    assert.ok(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')), 'removal keeps the project files');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'registry changes create no project commits');
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.deepEqual((await readKnownProjects(env)).entries.map((entry) => entry.projectRoot), [project], 'a later explicit start registers it again');
    await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    view.child.kill('SIGINT');
    await new Promise((resolve) => view.child.once('close', resolve));
    const single = await ptbk(['dashboard', '--raw'], { cwd: project, env });
    assert.notEqual(single.code, 0, 'a per-project dashboard still reports a missing service');
});

test('lifecycle: an accepted manual pause survives an engine crash; a deliberate stop replaces it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const paused = await ptbk(['pause', '--raw'], { cwd: project, env });
    assert.equal(paused.code, 0, paused.output);
    await waitFor(async () => (await status(project, env)).service.state === 'pause', { message: 'the pause to settle' });
    await ptbk(['add', 'Queued work', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const before = await status(project, env);
    // An uncatchable kill is what a crash looks like: no cleanup and no chance to record anything.
    process.kill(before.service.pid, 'SIGKILL');
    await waitFor(async () => (await status(project, env)).service.state === 'stopped', { message: 'the killed engine to be observed as stopped' });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const restored = await status(project, env);
    assert.notEqual(restored.service.instanceId, before.service.instanceId);
    assert.equal(restored.service.state, 'pause', 'the operator’s manual pause is restored before any background claim');
    assert.deepEqual(restored.service.pauseReasons.map((reason) => reason.kind), ['manual']);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    assert.equal(findGenerated(await subjects(project), 'Queued work', 'ptbk: '), undefined, 'queued work waits for an explicit resume');
    const resumed = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.equal(resumed.code, 0, resumed.output);
    await waitFor(async () => findGenerated(await subjects(project), 'Queued work', 'ptbk: '), { message: 'the queued work after resume' });
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await status(project, env)).service.state, 'running', 'an explicit start after a deliberate stop runs again');
    await ptbk(['stop', '--raw'], { cwd: project, env });
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'operator intent is runtime-only and never committed');
});

test('startup work intent: only a run the host terminated may continue; stopped and ambiguously lost services restore paused', async () => {
    const { startupWorkIntent } = await import('../dist/engine/operator-intent.js');
    const at = '2026-10-29T10:00:00.000Z';
    assert.equal(startupWorkIntent({ intentionallyStopped: false }, { version: 1, hostTermination: { at }, savedAt: at }), 'running');
    assert.equal(startupWorkIntent({ intentionallyStopped: false }, { version: 1, manualPause: { since: at, cause: 'operator' }, savedAt: at }), 'running', 'the engine itself restores the manual pause');
    assert.equal(startupWorkIntent({ intentionallyStopped: true }, { version: 1, hostTermination: { at }, savedAt: at }), 'inactive', 'stop, force stop and panic restore paused');
    assert.equal(startupWorkIntent({ intentionallyStopped: false }, { version: 1, savedAt: at }), 'unexpected-loss', 'a process that disappeared never grants work authority');
    assert.equal(startupWorkIntent({ intentionallyStopped: false }, undefined), 'unexpected-loss');
});

test('lifecycle: start --paused, and OS startup restores stopped services paused, host-terminated ones running and crashed workers paused', { skip: process.platform === 'win32' && 'POSIX signals simulate host termination and crashes' }, async (t) => {
    const { project, env, directory } = await initializedProject(t, { check: CHECK });
    // Startup registration of the simulated OS startup goes to a private home, never the real one.
    const home = join(directory, 'os home');
    const startupEnv = { ...env, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), APPDATA: join(home, 'AppData') };
    const intentPath = join(project, '.ptbk', 'service', 'intent.json');
    const launchPath = join(project, '.ptbk', 'service', 'launch.json');
    const osStartup = async () => {
        const restored = await ptbk(['start', '--resume-service', '--non-interactive', '--raw', '--path', project], { cwd: directory, env: startupEnv });
        assert.equal(restored.code, 0, restored.output);
        return restored.stdout;
    };
    const quiet = async (title, reason) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        assert.equal(findGenerated(await subjects(project), title, 'ptbk: '), undefined, reason);
    };
    await ptbk(['add', 'Queued work', '--agent', 'Developer', '--raw'], { cwd: project, env });

    const started = await ptbk(['start', '--paused', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.match(started.stdout, /^Started paused/, started.output);
    const paused = await status(project, env);
    assert.equal(paused.service.state, 'pause', 'the manual reason holds before the first scheduling opportunity');
    assert.match(paused.service.pauseReasons[0].summary, /Started paused/);
    await quiet('Queued work', 'no queued task runs');
    assert.equal(findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), undefined, 'no bootstrap task starts while paused');
    const repeated = await ptbk(['start', '--paused', '--raw'], { cwd: project, env });
    assert.match(repeated.stdout, /^Already running/, repeated.output);
    assert.equal((await status(project, env)).service.instanceId, paused.service.instanceId, 'a live owner keeps its state');
    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => findGenerated(await subjects(project), 'Queued work', 'ptbk: '), { message: 'the queued work after resume' });

    // A deliberate stop is restored paused by the next OS startup (simulated: the registered launch is persistent).
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    const launch = JSON.parse(await readFile(launchPath, 'utf8'));
    assert.equal(launch.intentionallyStopped, true);
    await writeFile(launchPath, `${JSON.stringify({ ...launch, persistent: true }, null, 4)}\n`);
    assert.match(await osStartup(), /Restored ptbk service paused \(it was stopped before/);
    const inactive = await status(project, env);
    assert.equal(inactive.service.state, 'pause');
    assert.match(inactive.service.pauseReasons[0].summary, /deliberate stop/);
    await ptbk(['add', 'After reboot work', '--agent', 'Developer', '--raw'], { cwd: project, env });
    await quiet('After reboot work', 'a restored stopped project runs no queued task until Resume');
    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => findGenerated(await subjects(project), 'After reboot work', 'ptbk: '), { message: 'the work queued after the restore' });

    // A host termination request (OS shutdown) of a running service lets the next startup continue its work.
    const running = await status(project, env);
    assert.equal(running.service.state, 'running');
    process.kill(running.service.pid, 'SIGTERM');
    await waitFor(async () => (await status(project, env)).service.state === 'stopped', { message: 'the terminated service to end' });
    assert.ok(JSON.parse(await readFile(intentPath, 'utf8')).hostTermination, 'the termination request is recorded');
    await ptbk(['add', 'Work after shutdown', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.doesNotMatch(await osStartup(), /paused/);
    await waitFor(async () => findGenerated(await subjects(project), 'Work after shutdown', 'ptbk: '), { message: 'work to continue after a host-terminated run' });

    // A crashed worker is restarted by its supervisor, but only paused (crashed while idle: no authoring is cut off).
    let idlePolls = 0;
    const before = await waitFor(async () => {
        const snapshot = await status(project, env);
        const idle = snapshot.service.state === 'running' && !snapshot.current && !snapshot.queueTotal && !(await git(project, ['status', '--porcelain'])).trim();
        idlePolls = idle ? idlePolls + 1 : 0;
        return idlePolls >= 4 ? snapshot : undefined;
    }, { timeoutMs: 90_000, intervalMs: 500, message: 'the follow-up work to settle' });
    process.kill(before.service.pid, 'SIGKILL');
    const recovered = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.service.state !== 'stopped' && snapshot.service.instanceId !== before.service.instanceId ? snapshot : undefined;
    }, { timeoutMs: 30_000, message: 'the supervisor to restart the crashed worker' });
    assert.equal(recovered.service.state, 'pause');
    assert.match(recovered.service.pauseReasons[0].summary, /ended unexpectedly/);
    assert.equal((await ptbk(['stop', '--force', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await git(project, ['ls-files', '.ptbk'])).trim(), '', 'lifecycle intent is runtime-only and never committed');
});
