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
    assert.equal((await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await subjects(project)).some((subject) => generated('Stubborn page NEEDS_FIXER', 'PTBK: ').test(subject)), { message: 'the result after Fixer took over', timeoutMs: 90_000 });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.deepEqual((await turnsOf(log, 'Stubborn page NEEDS_FIXER')).map((turn) => turn.agent), ['Developer', 'Fixer'], 'Fixer continues the same task once, before anyone is asked');
    assert.equal((await waitingChats(project, env)).length, 0, 'no routine decision is asked of the user');
    const result = (await messages(project)).find((message) => generated('Stubborn page NEEDS_FIXER', 'PTBK: ').test(message.split('\n')[0]));
    assert.match(result, /Completed by Fixer after Developer could not: Developer reported the task as blocked/);
    assert.match(result, /^Task-Name: Stubborn page NEEDS_FIXER/m, 'one ordinary result commit of the task');
    assert.match(await readFile(join(project, source), 'utf8'), /TASK DONE /);
    const events = (await readFile(join(project, traceDirectoryOf(source), 'events.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.ok(events.some((event) => event.event === 'handed-over' && event.to === 'Fixer' && event.from === 'Developer'), 'the takeover is part of the task evidence');
});

test('automatic repair: when Fixer cannot resolve a failure either, Fixer asks how to continue', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await addTask(project, env, 'Impossible BLOCKED work');
    assert.equal((await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const [chat] = await waitFor(async () => {
        const chats = await waitingChats(project, env);
        return chats.length ? chats : undefined;
    }, { message: 'the recovery decision', timeoutMs: 90_000 });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.equal(chat.agent, '@Fixer', 'the agent that last handled the problem asks, under its own Book');
    assert.deepEqual(chat.awaiting.choices, ['Retry the task', 'Acknowledge the failure']);
    assert.deepEqual((await turnsOf(log, 'Impossible BLOCKED work')).map((turn) => turn.agent), ['Developer', 'Fixer'], 'one bounded Fixer round, no loop');
});
