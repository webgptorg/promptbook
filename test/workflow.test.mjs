import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { traceDirectoryOf } from '../dist/tasks/identity.js';
import { findGenerated, generated, git, initializedProject, messages, ptbk, subjects } from './helpers.mjs';

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
 * Chats whose agent waits for the user, as JSON.
 */
async function waitingChats(project, env) {
    return JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
}

test('unattended init saves setup, a blank initial specification and one named Expert task; repeating it is a no-op', async (t) => {
    const { project, env, init } = await initializedProject(t);
    assert.equal(init.code, 0, init.output);
    assert.match(init.stdout, /Setup complete · service not running/);
    assert.match(init.stdout, /Service: not started \(--no-start\)/);
    assert.deepEqual(await subjects(project), ['PTBK: Initialize project']);
    for (const path of ['ptbk.json', 'AGENTS.md', 'agents/.core/adam.book', 'agents/.core/manager.book', 'agents/.core/teacher.book', 'agents/.core/fixer.book', 'agents/developer.book', 'tasks/templates/feature.book']) {
        await readFile(join(project, path), 'utf8');
    }
    assert.equal(await readFile(join(project, 'specs', '_initial.md'), 'utf8'), '', 'blank intent is preserved as blank');
    assert.match(await readFile(join(project, 'agents', '.core', 'teacher.book'), 'utf8'), /CLOSED\s*$/);
    const fixer = await readFile(join(project, 'agents', '.core', 'fixer.book'), 'utf8');
    assert.match(fixer, /^AGENT Fixer\nFROM @Adam\n/);
    assert.match(fixer, /^TEAM Consult @Expert/m);
    assert.match(fixer, /^OPEN /m, 'Fixer is open to project-specific learning');
    const ignore = await readFile(join(project, '.gitignore'), 'utf8');
    assert.match(ignore, /\.ptbk\//);
    assert.match(ignore, /^\/traces\/$/m, 'traces stay local by default');
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(config.harnesses['openai-codex'].enabled, true);
    assert.equal(config.execution.check, 'ptbk lint');
    assert.deepEqual(config.traces, { commit: false, ignoreVideos: true, recordVideo: true });
    assert.equal(config.browser.profile, 'global', 'the dedicated Promptbook profile is the new default (a portable kind, no machine path)');
    const tasks = (await readdir(join(project, 'tasks'))).filter((name) => name.endsWith('.book'));
    assert.equal(tasks.length, 1);
    const bootstrap = await readFile(join(project, 'tasks', tasks[0]), 'utf8');
    assert.match(bootstrap, /^TASK AGENT @Expert$/m);
    assert.match(bootstrap, /\]\(\.\.\/specs\/_initial\.md\)/, 'links the initial specification from the task source');
    const bootstrapName = generated('Review the initialized project');
    assert.match(bootstrap.split('\n')[0], generated('Review the initialized project', 'TASK '), 'TASK declares the generated name (title plus creation date/time); no ID');
    assert.doesNotMatch(bootstrap, /TASK ID|ENTITY/);
    assert.match((await messages(project))[0], generated('Review the initialized project', 'Task-Name: '), 'the setup commit references the first task by name');
    for (const path of ['agents/.core/adam.book', 'agents/.core/manager.book', 'agents/.core/teacher.book', 'agents/.core/fixer.book', 'agents/developer.book']) {
        assert.match(await readFile(join(project, path), 'utf8'), /^AGENT [A-Z][a-z]+\n/, `${path} starts with its AGENT declaration`);
    }
    const again = await ptbk(['init', '--non-interactive', '--no-start', '--raw'], { cwd: project, env });
    assert.equal(again.code, 0, again.output);
    assert.deepEqual(await subjects(project), ['PTBK: Initialize project'], 'no empty or duplicate setup commit');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    assert.equal((await readdir(join(project, 'tasks'))).filter((name) => name.endsWith('.book')).length, 1, 'the first task is never duplicated');
    const list = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    assert.match(list.tasks[0].name, bootstrapName);
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

test('the Expert bootstrap and an ordinary task: result, TASK DONE, Task-Name trailers, local traces and the learning follow-up', async (t) => {
    const { project, env } = await initializedProject(t);
    const bootstrap = await ptbk(['run', '--agent', 'Expert', '--raw'], { cwd: project, env });
    assert.equal(bootstrap.code, 0, bootstrap.output);
    assert.match(bootstrap.stdout, /1 completed, 0 failed/);
    assert.match((await subjects(project))[0], generated('Review the initialized project', 'PTBK: '));
    const bootstrapName = /^Task-Name: (.+)$/m.exec((await messages(project))[0])[1];
    assert.match(bootstrapName, generated('Review the initialized project'));
    const bootstrapTrace = traceDirectoryOf(bootstrapName);
    assert.ok((await changedFiles(project)).includes('docs/promptbook-readiness.md'));
    assert.ok(!(await changedFiles(project)).some((file) => file.startsWith('traces/')), 'traces are not committed by default');
    const harnessLog = await readFile(join(project, bootstrapTrace, 'harness.log'), 'utf8');
    assert.match(harnessLog, /Attempt 1\/3/);
    assert.match(harnessLog, /agent_message/, 'the exposed harness stream is kept, not only a summary');
    const events = (await readFile(join(project, bootstrapTrace, 'events.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.event).slice(0, 2), ['started', 'attempt-started']);
    assert.ok(events.some((event) => event.event === 'check' && event.passed));
    const local = await readFile(join(project, bootstrapTrace, 'local', 'events.jsonl'), 'utf8');
    assert.match(local, /"event":"committed"/, 'the commit SHA is recorded after the snapshot, outside it');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');

    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const result = await ptbk(['run', '--raw'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /1 completed, 0 failed/);
    const [subject] = await subjects(project);
    assert.match(subject, generated('Write the welcome page', 'PTBK: '));
    const files = await changedFiles(project);
    assert.ok(files.some((file) => /learn-/.test(file)), 'Teacher follow-up is part of the result commit');
    const [message] = await messages(project);
    const taskName = /^Task-Name: (.+)$/m.exec(message)[1];
    assert.match(taskName, generated('Write the welcome page'));
    const followUp = /^Created-Task-Name: (.+)$/m.exec(message)[1];
    assert.match(followUp, generated(`Learn from: ${taskName}`), 'the follow-up gets its own generated name');
    const learning = await readFile(join(project, files.find((file) => /learn-/.test(file))), 'utf8');
    assert.equal(learning.split('\n')[0], `TASK ${followUp}`);
    assert.ok(learning.includes(`TASK ORIGIN learning from {{${taskName}}} by @Developer`), learning);
    assert.doesNotMatch(learning, /TASK ID|ENTITY/);
    assert.ok(learning.includes(`Evidence: ${traceDirectoryOf(taskName)}/harness.log`), learning);
    const task = (await readdir(join(project, 'tasks'))).find((name) => name.includes('welcome-page') && !name.includes('learn-'));
    assert.match(await readFile(join(project, 'tasks', task), 'utf8'), /TASK DONE \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    const developerRun = await ptbk(['run', '--raw'], { cwd: project, env });
    assert.match(developerRun.stdout, /0 completed/, "Teacher's learning task is incompatible with a Developer run");
    const teacherRun = await ptbk(['run', '--agent', 'Teacher', '--raw'], { cwd: project, env });
    assert.match(teacherRun.stdout, /1 completed/, teacherRun.output);
    assert.ok((await messages(project))[0].includes(`Task-Name: ${followUp}\n`), 'the Teacher result carries the full follow-up name');
});

test('a failing check feeds a repair attempt; completion is only stamped after the check passes', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Repair me FAIL_CHECK_ONCE', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const result = await ptbk(['run', '--raw', '--limit', '2', '--min-priority', '0'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /Check failed/);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => generated('Repair me FAIL_CHECK_ONCE').test(entry.title));
    assert.deepEqual(turns.map((turn) => turn.attempt), [1, 2]);
    assert.ok(findGenerated(await subjects(project), 'Repair me FAIL_CHECK_ONCE', 'PTBK: '));
});

test('a blocked agent leaves a recovery decision; acknowledging records the failure in its own commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Impossible BLOCKED work', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    const run = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 1, run.output);
    assert.match(run.stdout, /reported the task as blocked/);
    const chats = await waitingChats(project, env);
    assert.equal(chats.length, 1);
    assert.equal(chats[0].agent, '@Developer', 'the task agent asks, not the environment');
    assert.deepEqual(chats[0].awaiting.choices, ['Retry the task', 'Acknowledge the failure']);
    assert.match(chats[0].links[0], generated('Impossible BLOCKED work', '{{', '}}'));
    const inspect = await ptbk(['recover', '--raw'], { cwd: project, env });
    assert.match(inspect.stdout, /Phase: failed/);
    const reference = /Task: .* \(([^)]+)\) —/.exec(inspect.stdout)[1];
    const acknowledged = await ptbk(['recover', reference, '--action', 'acknowledge', '--raw'], { cwd: project, env });
    assert.equal(acknowledged.code, 0, acknowledged.output);
    assert.match((await subjects(project))[0], generated('Impossible BLOCKED work', 'PTBK: Mark failed - '));
    const list = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    assert.equal(list.tasks.find((task) => generated('Impossible BLOCKED work').test(task.title)).readiness, 'failed');
    assert.equal((await waitingChats(project, env)).length, 0);
});

test('a user question makes a finite run incomplete; the answer resumes the same task', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    const first = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(first.code, 3, first.output);
    assert.match(first.stdout, /chat\(s\) waiting for you/);
    const [chat] = await waitingChats(project, env);
    assert.match(chat.awaiting.text, /Which color should the fixture use\?/);
    assert.equal((await ptbk(['answer', chat.name, 'blue', '--raw'], { cwd: project, env })).code, 0);
    const second = await ptbk(['run', '--raw', '--limit', '1', '--git-changes', 'continue'], { cwd: project, env });
    assert.equal(second.code, 0, second.output);
    assert.match((await subjects(project))[0], generated('Choose a color ASK_USER', 'PTBK: '));
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
    assert.match(future, /^TASK Future work\nGOAL With description\.\n/, 'the existing name is kept (no new date) and the payload moves under GOAL');
    assert.match(future, /TASK PRIORITY 2/);
    assert.match(future, /TASK AFTER 2099-01-01/);
    assert.match(future, /TASK RUNNER `gpt`/);
    const done = await readFile(join(project, 'tasks', books.find((name) => name.includes('old-finished'))), 'utf8');
    assert.match(done, /TASK DONE 2026-10-01T10:00:00\+02:00/);
    await readFile(join(project, 'tasks', 'archive', 'legacy.md'), 'utf8');
    const again = await ptbk(['migrate', '--raw'], { cwd: project, env });
    assert.match(again.stdout, /Nothing to migrate/);
});

test('migrate converts Books in former syntax explicitly, keeping names and content; read-only commands never rewrite them', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await writeFile(join(project, 'agents', 'reviewer.book'), 'Reviewer\n\nReviews pull requests carefully.\n\nRULE API changes need a changelog entry.\n');
    await writeFile(join(project, 'tasks', 'old.book'), 'Old task\nENTITY TASK\n\nKeep the export stable.\n\nTASK AGENT @Developer\n');
    await writeFile(join(project, 'tasks', 'header.book'), 'TASK Header style\n\nDescribed below the name.\n\nTASK AGENT @Developer\n');
    await writeFile(join(project, 'docs.book'), 'Mystery\n\nNo kind anywhere.\n');
    await git(project, ['add', '.']);
    await git(project, ['commit', '-qm', 'former syntax']);
    const listed = JSON.parse((await ptbk(['list', '--json', '--all'], { cwd: project, env })).stdout);
    assert.equal(listed.tasks.find((task) => task.source === 'tasks/old.book').readiness, 'blocked', 'former syntax is listed but never dispatched');
    await ptbk(['lint', '--raw'], { cwd: project, env });
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'read-only commands never rewrite sources');
    const migrated = await ptbk(['migrate', '--raw'], { cwd: project, env });
    assert.equal(migrated.code, 3, migrated.output);
    assert.match(migrated.stdout, /Not converted: docs\.book: its kind is unknown/);
    assert.equal((await subjects(project))[0], 'PTBK: Convert Books to canonical syntax');
    assert.equal(await readFile(join(project, 'agents', 'reviewer.book'), 'utf8'), 'AGENT Reviewer\nPERSONA Reviews pull requests carefully.\n\nRULE\n\\API changes need a changelog entry.\n');
    assert.equal(await readFile(join(project, 'tasks', 'old.book'), 'utf8'), 'TASK Old task\nGOAL Keep the export stable.\n\nTASK AGENT @Developer\n');
    assert.equal(await readFile(join(project, 'tasks', 'header.book'), 'utf8'), 'TASK Header style\nGOAL Described below the name.\n\nTASK AGENT @Developer\n');
    assert.equal(await readFile(join(project, 'docs.book'), 'utf8'), 'Mystery\n\nNo kind anywhere.\n', 'an ambiguous source is left untouched');
    const after = JSON.parse((await ptbk(['list', '--json', '--all'], { cwd: project, env })).stdout);
    assert.equal(after.tasks.find((task) => task.source === 'tasks/old.book').readiness, 'ready');
    assert.equal(after.tasks.find((task) => task.source === 'tasks/old.book').name, 'Old task', 'conversion keeps the name; no creation date is added');
    const again = await ptbk(['migrate', '--raw'], { cwd: project, env });
    assert.doesNotMatch(again.stdout, /Convert /);
});
