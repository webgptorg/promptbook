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
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Next work', '--agent', 'Developer', '--priority', '8', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
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
    assert.ok(findGenerated(await subjects(project), 'Slow work SLOW_WORK', 'PTBK: '), 'the current task finished normally');
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(findGenerated(await subjects(project), 'Next work', 'PTBK: '), undefined, 'no next task is claimed while paused');
    assert.equal((await status(project, env)).current, undefined);
    const again = await ptbk(['pause', '--raw'], { cwd: project, env });
    assert.match(again.stdout, /Already paused/, 'repeating pause is idempotent');

    const resumed = await ptbk(['resume', '--raw'], { cwd: project, env });
    assert.equal(resumed.code, 0, resumed.output);
    assert.equal((await status(project, env)).service.state, 'running');
    await waitFor(async () => findGenerated(await subjects(project), 'Next work', 'PTBK: '), { message: 'work to continue after resume' });
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
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
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
    await waitFor(async () => findGenerated(await subjects(project), 'Slow work SLOW_WORK', 'PTBK: '), { message: 'the task to finish' });
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
    for (const role of ['@Developer', '@Planner', '@Lawyer', '@Copywriter', '@Adam', '@Manager', '@Teacher', '@Fixer', '@Expert']) assert.ok(team.includes(role), `${role} is a teammate: ${team}`);
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
    assert.ok(history.includes(`PTBK: Chat - ${consultation.name}`), 'a conversation-scoped consultation has its own scoped commit');
    assert.ok(!history.slice(0, history.length - before).some((subject) => /^PTBK: (?!Chat - )/.test(subject)), 'no task was created or executed');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    await writeFile(join(project, 'agents', '.core', 'chatter.book'), `${chatter}RULE Answer in one paragraph.\n`);
    await git(project, ['commit', '-qam', 'Customize Chatter']);
    const reinit = await ptbk(['init', '--non-interactive', '--no-start', '--raw'], { cwd: project, env });
    assert.ok([0, 3].includes(reinit.code), reinit.output);
    assert.match(await readFile(join(project, 'agents', '.core', 'chatter.book'), 'utf8'), /RULE Answer in one paragraph\./, 'reinit preserves a customized Chatter');
});

test('global dashboard: works outside any project with zero engines, notices a later start, and --path conflicts', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const elsewhere = await temporaryDirectory(t, 'ptbk elsewhere');
    const conflict = await ptbk(['dashboard', '--global', '--path', project, '--raw'], { cwd: elsewhere, env });
    assert.equal(conflict.code, 2, conflict.output);
    const child = spawn(process.execPath, [BIN, 'dashboard', '--global', '--raw'], { cwd: elsewhere, env, stdio: ['ignore', 'pipe', 'pipe'] });
    t.after(() => child.kill('SIGKILL'));
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    await waitFor(() => /0 found/.test(output) && /No running engines; still watching/.test(output), { message: 'the empty global view' });
    assert.equal(child.exitCode, null, 'zero engines is a usable, continuous view');
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(() => /\+ my project \[running\] ptbk .* · daemon · PID \d+/.test(output), { message: 'the started engine to appear' });
    await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    await waitFor(() => /- my project \[ended\]/.test(output), { message: 'the stopped engine to be labelled ended' });
    child.kill('SIGINT');
    await new Promise((resolve) => child.once('close', resolve));
    const single = await ptbk(['dashboard', '--raw'], { cwd: project, env });
    assert.notEqual(single.code, 0, 'a per-project dashboard still reports a missing service');
});
