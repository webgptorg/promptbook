import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { git, initializedProject, messages, ptbk, subjects } from './helpers.mjs';

/**
 * Fixture check: fails when any output file contains BROKEN.
 */
const CHECK = `import { existsSync, readdirSync, readFileSync } from 'node:fs';
if (existsSync('output')) for (const file of readdirSync('output')) if (readFileSync('output/' + file, 'utf8').includes('BROKEN')) { console.error('broken output: ' + file); process.exit(1); }
`;

/**
 * Files changed by a commit.
 */
async function changedFiles(project, revision = 'HEAD') {
    return (await git(project, ['show', '--name-only', '--format=', revision])).trim().split('\n').filter(Boolean);
}

/**
 * Pending requests as JSON.
 */
async function pendingRequests(project, env) {
    return JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
}

test('unattended init saves setup, a blank initial specification and one Expert task with its ID; repeating it is a no-op', async (t) => {
    const { project, env, init } = await initializedProject(t);
    assert.equal(init.code, 0, init.output);
    assert.match(init.stdout, /Setup complete · service not running/);
    assert.match(init.stdout, /Service: not started \(--no-start\)/);
    assert.deepEqual(await subjects(project), ['PTBK: Initialize project']);
    for (const path of ['ptbk.json', 'AGENTS.md', 'agents/.core/adam.book', 'agents/.core/manager.book', 'agents/.core/teacher.book', 'agents/developer.book', 'tasks/templates/feature.book']) {
        await readFile(join(project, path), 'utf8');
    }
    assert.equal(await readFile(join(project, 'specs', '_initial.md'), 'utf8'), '', 'blank intent is preserved as blank');
    assert.match(await readFile(join(project, 'agents', '.core', 'teacher.book'), 'utf8'), /CLOSED\s*$/);
    const ignore = await readFile(join(project, '.gitignore'), 'utf8');
    assert.match(ignore, /\.ptbk\//);
    assert.match(ignore, /^\/traces\/$/m, 'traces stay local by default');
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(config.harnesses['openai-codex'].enabled, true);
    assert.equal(config.execution.check, 'ptbk lint');
    assert.deepEqual(config.traces, { commit: false, ignoreVideos: true, recordVideo: true });
    const tasks = (await readdir(join(project, 'tasks'))).filter((name) => name.endsWith('.book'));
    assert.equal(tasks.length, 1);
    const bootstrap = await readFile(join(project, 'tasks', tasks[0]), 'utf8');
    assert.match(bootstrap, /^TASK AGENT @Expert$/m);
    assert.match(bootstrap, /\]\(\.\.\/specs\/_initial\.md\)/, 'links the initial specification from the task source');
    const id = /^TASK ID (\S+)$/m.exec(bootstrap)[1];
    assert.match((await messages(project))[0], new RegExp(`^Task-ID: ${id}$`, 'm'), 'the setup commit references the first task');
    const again = await ptbk(['init', '--non-interactive', '--no-start', '--raw'], { cwd: project, env });
    assert.equal(again.code, 0, again.output);
    assert.deepEqual(await subjects(project), ['PTBK: Initialize project'], 'no empty or duplicate setup commit');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    assert.equal((await readdir(join(project, 'tasks'))).filter((name) => name.endsWith('.book')).length, 1, 'the first task is never duplicated');
    const list = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    assert.equal(list.tasks[0].id, id);
    assert.equal(list.tasks[0].readiness, 'ready');
    const refused = await ptbk(['init', '--non-interactive', '--no-start', '--intent', 'Something else', '--raw'], { cwd: project, env });
    assert.notEqual(refused.code, 0, 'a recorded purpose is not reauthored');
});

test('unattended init without required decisions fails before any change', async (t) => {
    const { directory, env } = await initializedProject(t);
    const empty = join(directory, 'empty');
    const result = await ptbk(['init', '--path', empty, '--non-interactive', '--raw'], { cwd: directory, env });
    assert.equal(result.code, 3);
    assert.match(result.stderr, /--installation local\|global/);
    assert.match(result.stderr, /--harness <id>/);
    await assert.rejects(readdir(empty));
});

test('the Expert bootstrap and an ordinary task: result, TASK DONE, Task-ID trailers, local traces and the learning follow-up', async (t) => {
    const { project, env } = await initializedProject(t);
    const bootstrap = await ptbk(['run', '--agent', 'Expert', '--raw'], { cwd: project, env });
    assert.equal(bootstrap.code, 0, bootstrap.output);
    assert.match(bootstrap.stdout, /1 completed, 0 failed/);
    assert.equal((await subjects(project))[0], 'PTBK: Review the initialized project');
    const bootstrapId = /^Task-ID: (\S+)$/m.exec((await messages(project))[0])[1];
    assert.ok((await changedFiles(project)).includes('docs/promptbook-readiness.md'));
    assert.ok(!(await changedFiles(project)).some((file) => file.startsWith('traces/')), 'traces are not committed by default');
    const harnessLog = await readFile(join(project, 'traces', bootstrapId, 'harness.log'), 'utf8');
    assert.match(harnessLog, /Attempt 1\/3/);
    assert.match(harnessLog, /agent_message/, 'the exposed harness stream is kept, not only a summary');
    const events = (await readFile(join(project, 'traces', bootstrapId, 'events.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.event).slice(0, 2), ['started', 'attempt-started']);
    assert.ok(events.some((event) => event.event === 'check' && event.passed));
    const local = await readFile(join(project, 'traces', bootstrapId, 'local', 'events.jsonl'), 'utf8');
    assert.match(local, /"event":"committed"/, 'the commit SHA is recorded after the snapshot, outside it');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');

    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const result = await ptbk(['run', '--raw'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /1 completed, 0 failed/);
    const [subject] = await subjects(project);
    assert.equal(subject, 'PTBK: Write the welcome page');
    const files = await changedFiles(project);
    assert.ok(files.some((file) => /learn-/.test(file)), 'Teacher follow-up is part of the result commit');
    const [message] = await messages(project);
    const taskId = /^Task-ID: (\S+)$/m.exec(message)[1];
    const followUpId = /^Created-Task-ID: (\S+)$/m.exec(message)[1];
    assert.notEqual(taskId, followUpId);
    const learning = await readFile(join(project, files.find((file) => /learn-/.test(file))), 'utf8');
    assert.match(learning, new RegExp(`^TASK ID ${followUpId}$`, 'm'));
    assert.match(learning, new RegExp(`Evidence: traces/${taskId}/harness\\.log`));
    const task = (await readdir(join(project, 'tasks'))).find((name) => name.includes('welcome-page') && !name.includes('learn-'));
    assert.match(await readFile(join(project, 'tasks', task), 'utf8'), /TASK DONE \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    const developerRun = await ptbk(['run', '--raw'], { cwd: project, env });
    assert.match(developerRun.stdout, /0 completed/, "Teacher's learning task is incompatible with a Developer run");
    const teacherRun = await ptbk(['run', '--agent', 'Teacher', '--raw'], { cwd: project, env });
    assert.match(teacherRun.stdout, /1 completed/, teacherRun.output);
    assert.match((await messages(project))[0], new RegExp(`^Task-ID: ${followUpId}$`, 'm'));
});

test('a failing check feeds a repair attempt; completion is only stamped after the check passes', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Repair me FAIL_CHECK_ONCE', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const result = await ptbk(['run', '--raw', '--limit', '2', '--min-priority', '0'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /Check failed/);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => entry.title === 'Repair me FAIL_CHECK_ONCE');
    assert.deepEqual(turns.map((turn) => turn.attempt), [1, 2]);
    assert.ok((await subjects(project)).includes('PTBK: Repair me FAIL_CHECK_ONCE'));
});

test('a blocked agent leaves a recovery decision; acknowledging records the failure in its own commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Impossible BLOCKED work', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    const run = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 1, run.output);
    assert.match(run.stdout, /reported the task as blocked/);
    const requests = await pendingRequests(project, env);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].choices, ['Retry the task', 'Acknowledge the failure']);
    const inspect = await ptbk(['recover', '--raw'], { cwd: project, env });
    assert.match(inspect.stdout, /Phase: failed/);
    const reference = /Task: .* \(([^)]+)\) —/.exec(inspect.stdout)[1];
    const acknowledged = await ptbk(['recover', reference, '--action', 'acknowledge', '--raw'], { cwd: project, env });
    assert.equal(acknowledged.code, 0, acknowledged.output);
    assert.equal((await subjects(project))[0], 'PTBK: Mark failed - Impossible BLOCKED work');
    const list = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    assert.equal(list.tasks.find((task) => task.title === 'Impossible BLOCKED work').readiness, 'failed');
    assert.equal((await pendingRequests(project, env)).length, 0);
});

test('a user question makes a finite run incomplete; the answer resumes the same task', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    const first = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(first.code, 3, first.output);
    assert.match(first.stdout, /request\(s\) waiting for you/);
    const [request] = await pendingRequests(project, env);
    assert.equal(request.question, 'Which color should the fixture use?');
    assert.equal((await ptbk(['answer', request.id, 'blue', '--raw'], { cwd: project, env })).code, 0);
    const second = await ptbk(['run', '--raw', '--limit', '1', '--git-changes', 'continue'], { cwd: project, env });
    assert.equal(second.code, 0, second.output);
    assert.equal((await subjects(project))[0], 'PTBK: Choose a color ASK_USER');
    const outputs = await readdir(join(project, 'output'));
    const content = await readFile(join(project, 'output', outputs.find((name) => name.includes('choose-a-color'))), 'utf8');
    assert.match(content, /\(blue\)/);
});

test('explicit --no-commit creates no commits and reports uncommitted results', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const before = await subjects(project);
    const added = await ptbk(['add', 'Uncommitted work', '--agent', 'Developer', '--no-commit', '--raw'], { cwd: project, env });
    assert.match(added.stdout, /NOT committed/);
    const run = await ptbk(['run', '--no-commit', '--raw', '--limit', '1', '--priority', '0'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    assert.match(run.stdout, /not committed \(--no-commit\)/);
    assert.deepEqual(await subjects(project), before);
    assert.notEqual((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('unrelated dirty changes stop a default run; --git-changes ignore keeps them out of the result', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    await writeFile(join(project, 'notes.txt'), 'user work in progress\n');
    const refused = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(refused.code, 1, refused.output);
    assert.match(refused.stdout, /Uncommitted changes not owned by ptbk: notes\.txt/);
    const ignored = await ptbk(['run', '--raw', '--limit', '1', '--git-changes', 'ignore'], { cwd: project, env });
    assert.equal(ignored.code, 0, ignored.output);
    assert.ok(!(await changedFiles(project)).includes('notes.txt'));
    assert.match(await git(project, ['status', '--porcelain']), /\?\? notes\.txt/);
});

test('migrate converts Markdown sections into equivalent Books once', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await writeFile(join(project, 'tasks', 'legacy.md'), '[x] done 2026-10-01T10:00:00+02:00\n\nOld finished work\n---\n[ ] !! `gpt` `2099-01-01`\n\nFuture work\n\nWith description.\n---\n[-]\n\nHeld idea\n');
    await git(project, ['add', '.']);
    await git(project, ['commit', '-qm', 'legacy tasks']);
    const preview = await ptbk(['migrate', '--dry-run', '--raw'], { cwd: project, env });
    assert.match(preview.stdout, /Would create/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    const migrated = await ptbk(['migrate', '--raw'], { cwd: project, env });
    assert.equal(migrated.code, 0, migrated.output);
    assert.equal((await subjects(project))[0], 'PTBK: Migrate Markdown tasks to Books');
    const books = (await readdir(join(project, 'tasks'))).filter((name) => name.startsWith('legacy-'));
    assert.equal(books.length, 3);
    const future = await readFile(join(project, 'tasks', books.find((name) => name.includes('future'))), 'utf8');
    assert.match(future, /TASK PRIORITY 2/);
    assert.match(future, /TASK AFTER 2099-01-01/);
    assert.match(future, /TASK RUNNER `gpt`/);
    const done = await readFile(join(project, 'tasks', books.find((name) => name.includes('old-finished'))), 'utf8');
    assert.match(done, /TASK DONE 2026-10-01T10:00:00\+02:00/);
    await readFile(join(project, 'tasks', 'archive', 'legacy.md'), 'utf8');
    const again = await ptbk(['migrate', '--raw'], { cwd: project, env });
    assert.match(again.stdout, /No Markdown task files/);
});
