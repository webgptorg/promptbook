import assert from 'node:assert/strict';
import { appendFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { traceDirectoryOf } from '../dist/tasks/identity.js';
import { generated, git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

/**
 * Fixture check: fails when any output file contains BROKEN.
 */
const CHECK = `import { existsSync, readdirSync, readFileSync } from 'node:fs';
if (existsSync('output')) for (const file of readdirSync('output')) if (readFileSync('output/' + file, 'utf8').includes('BROKEN')) { console.error('broken output: ' + file); process.exit(1); }
`;

/**
 * Parents of a commit (full SHAs).
 */
async function parents(project, revision = 'HEAD') {
    return (await git(project, ['log', '-1', '--format=%P', revision])).trim().split(' ').filter(Boolean);
}

/**
 * Subject of one commit.
 */
async function subjectOf(project, revision) {
    return (await git(project, ['log', '-1', '--format=%s', revision])).trim();
}

/**
 * Temporary isolation branches still present.
 */
async function isolationBranches(project) {
    return (await git(project, ['branch', '--list', 'ptbk/*', '--format=%(refname:short)'])).trim().split('\n').filter(Boolean);
}

/**
 * Adds one task and returns its project-relative source path.
 */
async function addTask(project, env, title) {
    const added = await ptbk(['add', title, '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal(added.code, 0, added.output);
    return (await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n').find((file) => file.startsWith('tasks/') && file.endsWith('.book'));
}

/**
 * Starts an isolated finite run and resolves once its worktree exists (the task is executing in it); `finished`
 * resolves with the run's result (wrapped, so awaiting the start does not wait for the whole run).
 */
async function startIsolatedRun(project, env) {
    const finished = ptbk(['run', '--isolate', '--raw', '--limit', '1'], { cwd: project, env: { ...env, FAKE_CODEX_SLOW_MS: '5000' } });
    await waitFor(async () => (await readdir(join(project, '.ptbk', 'worktrees')).catch(() => [])).length > 0, { message: 'the isolated worktree' });
    return { finished };
}

test('isolation: the result reaches the branch through a visible merge commit even when a fast-forward was possible', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const source = await addTask(project, env, 'Write the isolated page');
    const before = (await git(project, ['rev-parse', 'HEAD'])).trim();
    const run = await ptbk(['run', '--isolate', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    assert.match(run.stdout, /visible merge commit/);
    const merge = await parents(project);
    assert.equal(merge.length, 2, 'the integration is a merge commit, not a fast-forward');
    assert.equal(merge[0], before, 'its first parent is the previous branch tip');
    assert.match(await subjectOf(project, 'HEAD'), generated('Write the isolated page', 'PTBK: Merge the isolated result of ', ' into main'));
    assert.match(await subjectOf(project, 'HEAD^2'), generated('Write the isolated page', 'PTBK: '), 'the original result commit is preserved as the second parent');
    assert.match(await readFile(join(project, source), 'utf8'), /TASK DONE /);
    const learning = (await readdir(join(project, 'tasks'))).find((name) => name.includes('-learn-'));
    assert.match(await readFile(join(project, 'tasks', learning), 'utf8'), /improve `agents\/developer\.book`/, 'the follow-up names the agent Book of the project, not a path relative to the worktree');
    assert.deepEqual(await isolationBranches(project), [], 'the merged temporary branch is removed');
    assert.equal((await git(project, ['worktree', 'list', '--porcelain'])).match(/^worktree /gm).length, 1, 'the temporary worktree is removed');
    // Local (ignored) evidence written inside the worktree survives in the project's traces/.
    assert.match(await readFile(join(project, traceDirectoryOf(source), 'harness.log'), 'utf8'), /Attempt 1\/3/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('isolation: intervening project commits are kept and the merged content is checked again', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await addTask(project, env, 'Slow isolated page SLOW_WORK');
    const running = await startIsolatedRun(project, env);
    await writeFile(join(project, 'notes.md'), 'Written on the project branch meanwhile.\n');
    await git(project, ['add', 'notes.md']);
    await git(project, ['commit', '--quiet', '-m', 'Notes written meanwhile']);
    const intervening = (await git(project, ['rev-parse', 'HEAD'])).trim();
    const run = await running.finished;
    assert.equal(run.code, 0, run.output);
    const merge = await parents(project);
    assert.deepEqual(merge[0], intervening, 'the intervening commit stays in the history (no rebase)');
    assert.match(await subjectOf(project, 'HEAD^2'), generated('Slow isolated page SLOW_WORK', 'PTBK: '));
    assert.equal((await git(project, ['merge-base', 'HEAD^2', intervening])).trim() !== intervening, true, 'the result commit was not rewritten onto the newer tip');
    assert.ok((await subjects(project)).includes('Notes written meanwhile'));
    await readFile(join(project, 'notes.md'), 'utf8');
});

test('isolation: a conflicting result stays on its branch, goes to Fixer and completes once merged', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    const source = await addTask(project, env, 'Conflicting page SLOW_WORK');
    const running = await startIsolatedRun(project, env);
    // The project branch changes the same lines the result changes (the end of the task Book).
    await appendFile(join(project, source), 'NOTE Edited on the project branch meanwhile.\n');
    await git(project, ['add', source]);
    await git(project, ['commit', '--quiet', '-m', 'Edit the task meanwhile']);
    const run = await running.finished;
    assert.equal(run.code, 3, run.output);
    assert.match(run.stdout, /wait for integration/);
    const [branch] = await isolationBranches(project);
    assert.ok(branch, 'the unintegrated result is never deleted');
    assert.match((await subjects(project))[0], generated('Conflicting page SLOW_WORK', 'PTBK: Ask Fixer to integrate the isolated result of '));
    const fixerTask = (await readdir(join(project, 'tasks'))).find((name) => name.includes('integrate-isolated-result'));
    const fixerBook = await readFile(join(project, 'tasks', fixerTask), 'utf8');
    assert.match(fixerBook, /^TASK AGENT @Fixer$/m);
    assert.ok(fixerBook.includes(`TASK ORIGIN maintenance: integration of ${branch}`));
    assert.doesNotMatch(await readFile(join(project, source), 'utf8'), /TASK DONE /, 'the project branch has no completion before integration');
    const listed = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout).tasks.find((task) => generated('Conflicting page SLOW_WORK').test(task.title));
    assert.equal(listed.readiness, 'needs-recovery', 'a pending merge is not presented as a question for the user');
    assert.ok(listed.reason.includes(`waits on ${branch} for a visible merge`), listed.reason);

    // Someone (Fixer or a person) merges the branch visibly; the next pass completes the task without rerunning it.
    await git(project, ['merge', '--no-ff', '--quiet', '-X', 'theirs', '-m', 'PTBK: Merge the isolated result (resolved)', branch]);
    const turnsBefore = (await readFile(log, 'utf8')).trim().split('\n').length;
    const resumed = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(resumed.code, 0, resumed.output);
    assert.match(resumed.stdout, /is complete: its isolated result is merged/);
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, turnsBefore, 'no model work is repeated');
    assert.deepEqual(await isolationBranches(project), []);
    assert.equal((await git(project, ['worktree', 'list', '--porcelain'])).match(/^worktree /gm).length, 1);
});
