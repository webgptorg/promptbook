import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { traceDirectoryOf } from '../dist/tasks/identity.js';
import { generated, git, initializedProject, messages, ptbk, subjects, waitFor } from './helpers.mjs';

/**
 * Fixture check: fails when any output file contains BROKEN.
 */
const CHECK = `import { existsSync, readdirSync, readFileSync } from 'node:fs';
if (existsSync('output')) for (const file of readdirSync('output')) if (readFileSync('output/' + file, 'utf8').includes('BROKEN')) { console.error('broken output: ' + file); process.exit(1); }
`;

/**
 * Chats whose agent waits for the user, as JSON.
 */
async function waitingChats(project, env) {
    return JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
}

/**
 * Harness turns of one task (from the fake harness log), in order.
 */
async function turnsOf(log, title) {
    return (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
        .filter((entry) => generated(title).test(entry.title));
}

/**
 * Adds one task for Developer and returns its project-relative source path.
 */
async function addTask(project, env, title) {
    const added = await ptbk(['add', title, '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal(added.code, 0, added.output);
    return (await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n').find((file) => file.startsWith('tasks/') && file.endsWith('.book'));
}

test('automatic repair: a task its agent cannot finish is handed to Fixer, which completes it without asking anyone', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    const source = await addTask(project, env, 'Stubborn page NEEDS_FIXER');
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await subjects(project)).some((subject) => generated('Stubborn page NEEDS_FIXER', 'ptbk: ').test(subject)), { message: 'the result after Fixer took over', timeoutMs: 90_000 });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.deepEqual((await turnsOf(log, 'Stubborn page NEEDS_FIXER')).map((turn) => turn.agent), ['Developer', 'Fixer'], 'Fixer continues the same task once, before anyone is asked');
    assert.equal((await waitingChats(project, env)).length, 0, 'no routine decision is asked of the user');
    const result = (await messages(project)).find((message) => generated('Stubborn page NEEDS_FIXER', 'ptbk: ').test(message.split('\n')[0]));
    assert.match(result, /Completed by Fixer after Developer could not: Developer reported the task as blocked/);
    assert.match(result, /^Task-Name: Stubborn page NEEDS_FIXER/m, 'one ordinary result commit of the task');
    assert.match(await readFile(join(project, source), 'utf8'), /TASK DONE /);
    const events = (await readFile(join(project, traceDirectoryOf(source), 'events.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.ok(events.some((event) => event.event === 'handed-over' && event.to === 'Fixer' && event.from === 'Developer'), 'the takeover is part of the task evidence');
});

test('automatic repair: when Fixer cannot resolve a failure either, nobody is asked to retry; cause-aware rechecks follow with fresh budgets', async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, PTBK_RECOVERY_RECHECK_MS: '3000' };
    await addTask(project, env, 'Impossible BLOCKED work');
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const scheduled = await waitFor(async () => {
        const inspected = await ptbk(['recover', '--raw'], { cwd: project, env });
        return /Automatic recovery: recheck 1 due/.test(inspected.stdout) ? inspected.stdout : undefined;
    }, { message: 'the first automatic recheck to be scheduled', timeoutMs: 90_000 });
    assert.match(scheduled, /no reply is needed/);
    assert.match(scheduled, /tried: Developer, then Fixer,/, 'the remedies already tried are kept');
    assert.equal((await waitingChats(project, env)).length, 0, 'an exhausted budget never asks whether to retry');
    // The due recheck runs again with a fresh budget (the task's agent, then Fixer), and the equivalent failure waits longer.
    const second = await waitFor(async () => {
        const inspected = await ptbk(['recover', '--raw'], { cwd: project, env });
        return /Automatic recovery: recheck 2 due/.test(inspected.stdout) ? inspected.stdout : undefined;
    }, { message: 'the second automatic recheck to be scheduled', timeoutMs: 90_000 });
    assert.match(second, /the same failure repeated 1 time\(s\) under unchanged conditions/);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.deepEqual((await turnsOf(log, 'Impossible BLOCKED work')).map((turn) => turn.agent), ['Developer', 'Fixer', 'Developer', 'Fixer'], 'one bounded burst per round, no tight loop');
    assert.equal((await waitingChats(project, env)).length, 0);
});
