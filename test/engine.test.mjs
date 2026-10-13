import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as filesystem } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rename, rm, chmod, symlink, access, realpath, link, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runQueue, fixChecks, recoverTask, taskEligibility } from '../dist/coder/engine.js';
import { validateCheck } from '../dist/coder/checks.js';
import { git, discoverGit, captureSnapshot, commitScoped } from '../dist/coder/git.js';
import { acquireLease, atomicWrite, readLedger, readJournals, saveLedger, writeJournal } from '../dist/coder/state.js';
import { discoverTasks } from '../dist/coder/sources.js';
import { replaceFileWithRetry } from '../dist/coder/file-replacement.js';

test('checks reject direct and indirect worker recursion under both command namespaces', async t => {
    const workspace = await fixture(t, { empty: true });
    for (const command of ['ptbk run', 'npx ptbk fix', 'ptbk server', 'ptbk coder run']) {
        await assert.rejects(validateCheck(workspace, command), /recursively invokes/);
    }
    await writeFile(path.join(workspace.projectPath, 'package.json'), JSON.stringify({ scripts: {
        check: 'npm run validate', validate: 'npx ptbk run --no-ui',
    } }));
    await assert.rejects(validateCheck(workspace, 'npm run check'), /recursive/);
    await assert.rejects(validateCheck(workspace, 'npm run validate'), /recursive/);
    await writeFile(path.join(workspace.projectPath, 'package.json'), JSON.stringify({ scripts: {
        check: 'node check.cjs', test: 'node tests.cjs', pretest: 'npm run hidden', hidden: 'ptbk start',
    } }));
    await assert.rejects(validateCheck(workspace, 'npm --silent test'), /recursive/);
    await assert.rejects(validateCheck(workspace, 'npm run check && npm test'), /recursive/);
    await validateCheck(workspace, 'npm run check');
});

/** A local fixture has no provider credentials and no dependency on this repository. */
async function fixture(t, options = {}) {
    const directory = await mkdtemp(path.join(tmpdir(), 'ptbk-engine-'));
    const root = options.pathName ? path.join(directory, options.pathName) : directory;
    if (root !== directory) await mkdir(root);
    t.after(() => rm(directory, { recursive: true, force: true }));
    await git(root, ['init', '--quiet']);
    await git(root, ['config', 'user.name', 'Fixture Coder']);
    await git(root, ['config', 'user.email', 'fixture@example.test']);
    await git(root, ['config', 'commit.gpgsign', 'false']);
    await git(root, ['config', 'core.autocrlf', options.autocrlf ? 'true' : 'false']);
    await mkdir(path.join(root, 'agents'));
    await mkdir(path.join(root, 'tasks'));
    await mkdir(path.join(root, 'prompts'));
    await writeFile(path.join(root, 'agents/developer.book'), 'Developer\n\nFROM VOID\nGOAL Implement the fixture task.\nCLOSED\n');
    await writeFile(path.join(root, '.gitignore'), '.ptbk/\nnode_modules/\nignored.txt\n');
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { check: 'node check.cjs' } }));
    await writeFile(path.join(root, 'code.txt'), 'initial\n');
    if (!options.empty) await writeFile(path.join(root, 'tasks/task.book'), 'TASK Fixture implementation\n\nTASK ID fixture\nTASK PRIORITY 2\n\n\nImplement the fixture.\n');
    if (!options.unborn) { await git(root, ['add', '--', '.gitignore', 'agents', 'tasks', 'package.json', 'code.txt']); await git(root, ['commit', '-qm', 'Fixture baseline']); }
    return { projectPath: root, gitRoot: root, tasksPath: path.join(root, 'tasks'), legacyPath: path.join(root, 'prompts'), statePath: path.join(root, '.ptbk'), timezone: 'UTC' };
}

test('Git discovery and shared worktree leases preserve project path whitespace', async t => {
    const workspace = await fixture(t, { pathName: process.platform === 'win32' ? 'project with spaces' : 'project with trailing space ' });
    assert.equal(await realpath(await discoverGit(workspace.projectPath)), await realpath(workspace.projectPath));
    const lease = await acquireLease(workspace);
    assert.equal(lease.path, path.join(await realpath(workspace.projectPath), '.ptbk/workspace.lock'));
    await lease.release();
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
});

test('atomic runtime state retries transient Windows sharing violations without exposing partial or missing revisions', async t => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ptbk-atomic-')); t.after(() => rm(directory, { recursive: true, force: true }));
    const filename = path.join(directory, 'state.json'); const previous = { version: 1, value: 'previous' }; const next = { version: 1, value: 'next' };
    await atomicWrite(filename, previous); let attempts = 0; const waits = []; const temporaryFiles = new Set();
    await atomicWrite(filename, next, { platform: 'win32', sleep: async duration => { waits.push(duration); }, rename: async (source, destination) => {
        temporaryFiles.add(source); assert.deepEqual(JSON.parse(await readFile(source, 'utf8')), next);
        assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), previous);
        if (++attempts < 4) throw Object.assign(new Error('Reader temporarily holds the destination'), { code: ['EPERM', 'EBUSY', 'EACCES'][attempts - 1] });
        await replaceFileWithRetry(source, destination);
    } });
    assert.equal(attempts, 4); assert.equal(temporaryFiles.size, 1); assert.deepEqual(waits, [20, 40, 80]);
    assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), next);
    attempts = 0;
    await assert.rejects(atomicWrite(filename, previous, { platform: 'win32', sleep: async () => {}, rename: async () => {
        attempts++; throw Object.assign(new Error('Destination remained locked'), { code: 'EPERM' });
    } }), /remained locked/);
    assert.equal(attempts, 10); assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), next);
    assert.deepEqual(await readdir(directory), ['state.json']);
    attempts = 0;
    await assert.rejects(atomicWrite(filename, previous, { platform: 'linux', sleep: async () => { assert.fail('Permission errors are not transient on this platform'); }, rename: async () => {
        attempts++; throw Object.assign(new Error('Real permission error'), { code: 'EACCES' });
    } }), /Real permission error/);
    assert.equal(attempts, 1); assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), next);
});

/** Deterministic success double writes only the selected checkout. */
function implement(content = 'agent\n') {
    return async request => { await writeFile(path.join(request.projectPath, 'code.txt'), content); return { outcome: 'success', exitCode: 0, output: 'Fixture completed.' }; };
}

test('finite runs reconsider existing dependent tasks after each accepted prerequisite result', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.tasksPath, 'dependent.book'), 'TASK Dependent\nDependent work.\nTASK ID dependent\nTASK DEPENDS ON #prerequisite\nTASK PRIORITY 10\n');
    await writeFile(path.join(workspace.tasksPath, 'prerequisite.book'), 'TASK Prerequisite\nPrerequisite work.\nTASK ID prerequisite\n');
    await writeFile(path.join(workspace.tasksPath, 'blocked.book'), 'TASK Missing prerequisite\nTASK ID blocked\nTASK DEPENDS ON #missing\nTASK PRIORITY 20\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks']);
    await git(workspace.gitRoot, ['commit', '-qm', 'Dependent queue']);
    const calls = [];
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => {
        calls.push(request.taskId);
        await writeFile(path.join(request.projectPath, 'code.txt'), `${request.taskId}\n`);
        if (request.taskId === 'prerequisite') await writeFile(path.join(request.projectPath, 'tasks', 'follow-up.book'), 'TASK Follow-up\nTASK ID follow-up\n');
        return { outcome: 'success', exitCode: 0, output: 'Completed the selected work.' };
    } });
    assert.equal(result.exitCode, 0, JSON.stringify(result.events));
    assert.deepEqual(calls, ['prerequisite', 'dependent']);
    assert.equal(result.completed, 2);
    assert.equal(result.skipped, 1);
    assert.equal(result.commits.length, 2);
    assert.equal(result.events.filter(event => event.type === 'blocked' && event.taskId === 'blocked').length, 1);
    const tasks = await discoverTasks(workspace);
    assert.equal(tasks.find(task => task.id === 'dependent').status, 'done');
    assert.equal(tasks.find(task => task.id === 'follow-up').status, 'todo');
});

test('a future task can become eligible during finite work without waiting or leaving a stale next time', async t => {
    const workspace = await fixture(t, { empty: true });
    let now = Date.parse('2026-10-14T12:00:00Z');
    await writeFile(path.join(workspace.tasksPath, 'future.book'), 'TASK Future\nTASK ID future\nTASK AFTER 2026-10-14T12:01:00Z\nTASK PRIORITY 10\n');
    await writeFile(path.join(workspace.tasksPath, 'ready.book'), 'TASK Ready\nTASK ID ready\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks']);
    await git(workspace.gitRoot, ['commit', '-qm', 'Timed queue']);
    const calls = [];
    const result = await runQueue(workspace, { harness: 'openai-codex', now: () => now, runHarness: async request => {
        calls.push(request.taskId);
        now += 60_000;
        return implement(request.taskId)(request);
    } });
    assert.equal(result.exitCode, 0, JSON.stringify(result.events));
    assert.deepEqual(calls, ['ready', 'future']);
    assert.equal(result.completed, 2);
    assert.equal(result.skipped, 0);
    assert.equal(result.nextWakeUp, undefined);
});

test('exhausted task publication retains checked work and the original source file, then resumes without inference', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), 'process.exit(0);\n');
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']);
    await git(workspace.gitRoot, ['commit', '-qm', 'Passing validation']);
    const source = path.join(workspace.tasksPath, 'task.book');
    const original = await readFile(source);
    await mkdir(workspace.statePath);
    // Keeping an ignored hard link makes deleting/recreating an identical source detectable on every platform.
    const retained = path.join(workspace.statePath, 'retained-source');
    await link(source, retained);
    const originalFile = await stat(source, { bigint: true });
    let calls = 0;
    let attempts = 0;
    const result = await runQueue(workspace, {
        harness: 'openai-codex', check: 'npm run check', normalizeLineEndings: false,
        runHarness: async request => { calls++; return implement()(request); },
        sourceWriteOptions: {
            platform: 'win32', sleep: async () => {},
            rename: async () => { attempts++; throw Object.assign(new Error('Task source remained locked'), { code: 'EPERM' }); },
        },
    });
    assert.equal(calls, 1);
    assert.equal(attempts, 10);
    assert.equal(result.failed, 1, JSON.stringify(result.events));
    assert.equal(result.completed, 0);
    assert.equal(result.commits.length, 0);
    assert.equal(result.exitCode, 1);
    assert.ok(result.events.some(event => event.type === 'check-result' && event.outcome === 'passed'));
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'agent\n');
    assert.deepEqual(await readFile(source), original);
    assert.deepEqual(await readFile(retained), original);
    assert.equal((await stat(source, { bigint: true })).ino, originalFile.ino, 'Recovery must not delete/recreate an unchanged source');
    assert.equal((await stat(source, { bigint: true })).nlink, originalFile.nlink);
    assert.deepEqual(await readdir(workspace.tasksPath), ['task.book']);
    assert.equal((await readJournals(workspace))[0].phase, 'recovery-required');

    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, {
        normalizeLineEndings: false,
        runHarness: async () => { assert.fail('Checked implementation must not run again'); },
    });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events));
    assert.equal(resumed.commits.length, 1);
    assert.equal((await readJournals(workspace))[0].attempts, 1);
    assert.match(await readFile(source, 'utf8'), /TASK DONE /);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'agent\n');
});

test('one task uses one result commit and reports skipped validation honestly', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1);
    assert.equal(result.exitCode, 0);
    assert.equal(result.commits.length, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE \d{4}-\d\d-\d\dT/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
    assert.ok(result.events.some(event => event.type === 'checks-skipped'));
    assert.match(await git(workspace.gitRoot, ['show', `${result.commits[0]}:tasks/task.book`]), /TASK ID fixture/);
});

test('task-selected harnesses receive project-native defaults and browser tools without overriding task requirements', async t => {
    const { createFiniteRuntime } = await import('../dist/coder/finite.js');
    for (const taskModel of [undefined, 'explicit-model']) {
        const workspace = await fixture(t);
        const source = path.join(workspace.tasksPath, 'task.book');
        await writeFile(source, `TASK Routed task\n\nTASK ID fixture\nTASK HARNESS claude-code\n${taskModel ? `TASK MODEL ${taskModel}\n` : ''}\nImplement the fixture.\n`);
        await git(workspace.gitRoot, ['add', '--', 'tasks/task.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Task harness requirement']);
        let calls = 0;
        const runtime = await createFiniteRuntime(workspace, {
            harnessSettings: { 'claude-code': { model: 'configured-model', thinkingLevel: 'medium', apiKeyEnv: 'CUSTOM_SOURCE' } },
            runHarness: async request => {
                calls++;
                assert.equal(request.harness, 'claude-code'); assert.equal(request.model, taskModel ?? 'configured-model');
                assert.equal(request.thinkingLevel, 'medium'); assert.equal(request.harnessConfiguration.apiKeyEnv, 'CUSTOM_SOURCE');
                assert(request.tools.some(tool => tool.name === 'browser_navigate'));
                return implement()(request);
            },
        }, () => {});
        try {
            const result = await runQueue(workspace, runtime.options);
            assert.equal(result.completed, 1); assert.equal(calls, 1); assert.equal(result.commits.length, 1);
            assert.match(await readFile(source, 'utf8'), /TASK DONE/);
        } finally { await runtime.close(); }
    }
});

test('private checks include the checked formatter version in the single result commit', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','checker\\n');\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Fixture checker']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement(), check: 'npm run check' });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(result.commits.length, 1);
    assert.equal(await git(workspace.gitRoot, ['show', `${result.commits[0]}:code.txt`]), 'checker\n');
    assert.match(await git(workspace.gitRoot, ['show', '-s', '--format=%B', result.commits[0]]), /^Fixture implementation\n\nImplement the fixture\./);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('failed checks of the completion candidate repair the same task before its single result commit', async t => {
    const workspace = await fixture(t); let calls = 0;
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "const fs = require('node:fs'); if (fs.readFileSync('tasks/task.book','utf8').includes('TASK DONE') && fs.readFileSync('code.txt','utf8') !== 'fixed\\n') { console.error('Completion candidate needs fixed code'); process.exit(1); }\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Final candidate validation fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', check: 'npm run check', runHarness: async request => {
        calls++;
        if (calls === 2) {
            assert.match(request.prompt, /Completion candidate needs fixed code/);
            assert.doesNotMatch(await readFile(path.join(request.projectPath, 'tasks/task.book'), 'utf8'), /TASK DONE/);
        }
        return implement(calls === 1 ? 'agent\n' : 'fixed\n')(request);
    } });
    assert.equal(calls, 2); assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.equal(result.failed, 0);
    assert.equal(result.commits.length, 1);
    assert.equal(await git(workspace.gitRoot, ['show', `${result.commits[0]}:code.txt`]), 'fixed\n');
    assert.equal((await readJournals(workspace))[0].attempts, 2);
});

test('pre-existing staged and unstaged bytes remain in their original staging state', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'user.txt'), 'baseline\n');
    await git(workspace.gitRoot, ['add', '--', 'user.txt']); await git(workspace.gitRoot, ['commit', '-qm', 'User baseline']);
    await writeFile(path.join(workspace.projectPath, 'user.txt'), 'staged\n'); await git(workspace.gitRoot, ['add', '--', 'user.txt']);
    await writeFile(path.join(workspace.projectPath, 'user.txt'), 'unstaged\n');
    const before = await captureSnapshot(workspace.gitRoot);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement(), gitChanges: 'ignore' });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(await readFile(path.join(workspace.projectPath, 'user.txt'), 'utf8'), 'unstaged\n');
    assert.equal(await git(workspace.gitRoot, ['show', ':user.txt']), 'staged\n');
    const after = await captureSnapshot(workspace.gitRoot);
    assert.equal(after.index.split('\0').find(entry => entry.endsWith('\tuser.txt')), before.index.split('\0').find(entry => entry.endsWith('\tuser.txt')));
    assert.deepEqual(after.dirtyPaths, ['user.txt']);
});

test('a dirty path overlap blocks persistence and preserves the original bytes in the journal', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'code.txt'), 'user edit\n');
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement(), gitChanges: 'ignore' });
    assert.equal(result.completed, 0);
    assert.equal(result.exitCode, 1);
    const journals = await readJournals(workspace);
    assert.equal(Buffer.from(journals[0].baseline.files['code.txt'].content, 'base64').toString(), 'user edit\n');
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID fixture/);
});

test('failed checks preserve their own delta and bounded repair stays on the same task', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('check-output.txt','failure');process.exit(1);\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Failing checker']);
    let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement(`agent ${calls}\n`)(request); }, check: 'npm run check' });
    assert.equal(calls, 3);
    assert.equal(result.completed, 0);
    assert.equal(result.failed, 1);
    const subjects = await git(workspace.gitRoot, ['log', '--format=%s']);
    assert.equal(result.commits.length, 0);
    assert.doesNotMatch(subjects, /Fixture implementation/);
    assert.equal(await readFile(path.join(workspace.projectPath, 'check-output.txt'), 'utf8'), 'failure');
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID fixture/);
});

test('healthy fix needs neither a harness nor a Developer Book and commits formatter delta', async t => {
    const workspace = await fixture(t, { empty: true });
    await rm(path.join(workspace.projectPath, 'agents/developer.book'));
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','formatted\\n');\n");
    await git(workspace.gitRoot, ['add', '--', 'agents', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Healthy fixture']);
    const result = await fixChecks(workspace, { runHarness: async () => { throw new Error('Must not call a model'); } });
    assert.equal(result.exitCode, 0);
    assert.equal(result.completed, 1);
    assert.equal(result.commits.length, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'formatted\n');
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('dry-run with future tasks is read-only and cannot invoke a provider', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'TASK Future\n\nTASK ID fixture\nTASK AFTER 2099-01-01T00:00:00Z\n\nWait.\n');
    const result = await runQueue(workspace, { dryRun: true, now: () => 0, runHarness: async () => { throw new Error('No inference in preview'); } });
    assert.equal(result.nextWakeUp, Date.parse('2099-01-01T00:00:00Z'));
    await assert.rejects(access(workspace.statePath), { code: 'ENOENT' });
});

test('recurrence is coalesced and runs at most once per invocation, preserving todo', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'TASK Recurring\n\nTASK ID fixture\nTASK AFTER 2020-01-01T00:00:00Z\nTASK REPEAT 1w\n\nReview.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/task.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Recurring fixture']);
    let calls = 0; let now = Date.parse('2026-01-02T00:00:00Z');
    const options = { harness: 'openai-codex', now: () => now, runHarness: async request => { calls++; return implement(`review ${calls}\n`)(request); } };
    assert.equal((await runQueue(workspace, options)).completed, 1);
    assert.equal((await runQueue(workspace, options)).completed, 0);
    assert.equal(calls, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID /);
    const ledger = await readLedger(workspace); assert.ok(ledger.tasks.fixture.history[0].coalesced > 100);
    now += 604800000;
    assert.equal((await runQueue(workspace, options)).completed, 1);
    assert.equal(calls, 2);
});

test('usage/failure output never overrides a nonzero process exit', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async () => ({ outcome: 'process-failure', exitCode: 1, output: 'tokens used: 12\nturn.failed' }) });
    assert.equal(result.completed, 0);
    assert.equal(result.exitCode, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID fixture/);
});

test('safe technical retries have one initial attempt plus three retries', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', sleep: async () => {}, waitAfterError: 1, runHarness: async () => { calls++; return { outcome: 'transient', exitCode: 1, output: 'Temporary provider outage' }; } });
    assert.equal(calls, 4); assert.equal(result.failed, 1);
});

test('authentication failure is not technically retried', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async () => { calls++; return { outcome: 'authentication', exitCode: 1, output: 'Login required' }; } });
    assert.equal(calls, 1); assert.equal(result.completed, 0);
});

test('a failed result commit resumes persistence without repeating successful inference', async t => {
    const workspace = await fixture(t); let calls = 0;
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    const first = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement()(request); } });
    assert.equal(first.completed, 0); assert.equal(first.failed, 1);
    await rm(hook);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { harness: 'openai-codex', runHarness: async () => { throw new Error('Must not repeat model'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(calls, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE \d{4}-\d\d-\d\dT/);
});

test('lease prevents two independent writers and a nested project shares the same lease', async t => {
    const workspace = await fixture(t); const first = await acquireLease(workspace);
    try {
        await assert.rejects(acquireLease(workspace), /owned by PID/);
        await mkdir(path.join(workspace.projectPath, 'nested'));
        await assert.rejects(acquireLease({ ...workspace, projectPath: path.join(workspace.projectPath, 'nested') }), /owned by PID/);
    } finally { await first.release(); }
});

test('automatic no-commit requires explicit ignore and retains work across tasks', async t => {
    const workspace = await fixture(t);
    await assert.rejects(runQueue(workspace, { noCommit: true }), /requires --git-changes ignore/);
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'TASK Second\n\nTASK ID second\n\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/second.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Second task']);
    const result = await runQueue(workspace, { noCommit: true, gitChanges: 'ignore', harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 2); assert.equal(result.commits.length, 0); assert.ok(result.retainedPaths.includes('code.txt'));
});

test('an empty scoped delta cannot commit an unrelated staged path', async t => {
    const workspace = await fixture(t); await writeFile(path.join(workspace.projectPath, 'user.txt'), 'staged\n'); await git(workspace.gitRoot, ['add', '--', 'user.txt']);
    const before = await captureSnapshot(workspace.gitRoot);
    assert.equal(await commitScoped(before, 'Must not occur'), undefined);
    assert.equal((await captureSnapshot(workspace.gitRoot)).head, before.head);
    assert.equal(await git(workspace.gitRoot, ['show', ':user.txt']), 'staged\n');
});

test('binary, symlink, executable, addition and deletion persist without text corruption', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => {
        await rm(path.join(request.projectPath, 'code.txt'));
        await writeFile(path.join(request.projectPath, 'binary.bin'), Buffer.from([0, 255, 13, 10, 64]));
        await writeFile(path.join(request.projectPath, 'run.sh'), '#!/bin/sh\necho test\n'); await chmod(path.join(request.projectPath, 'run.sh'), 0o755);
        await symlink('run.sh', path.join(request.projectPath, 'linked'));
        return { outcome: 'success', exitCode: 0, output: 'Done' };
    } });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.deepEqual(await readFile(path.join(workspace.projectPath, 'binary.bin')), Buffer.from([0, 255, 13, 10, 64]));
    const modes = await git(workspace.gitRoot, ['ls-tree', 'HEAD', '--', 'linked', 'run.sh']);
    assert.match(modes, /120000 blob/);
    if (process.platform !== 'win32') assert.match(modes, /100755 blob/);
    else assert.match(modes, /100644 blob[\s\S]*run\.sh/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('concurrent editor during inference keeps both user bytes and the private agent result', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => {
        assert.notEqual(request.projectPath, workspace.projectPath);
        await writeFile(path.join(request.projectPath, 'code.txt'), 'private agent\n');
        await writeFile(path.join(workspace.projectPath, 'code.txt'), 'concurrent user\n');
        return { outcome: 'success', exitCode: 0, output: 'Implementation completed in private checkout.' };
    } });
    assert.equal(result.completed, 0); assert.equal(result.exitCode, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'concurrent user\n');
    const message = result.events.find(event => event.type === 'error').message;
    const view = /Private checkout is retained at (.+?)\./.exec(message)?.[1];
    assert.match(message, /content changed concurrently/);
    assert.ok(view);
});

test('result commit failure restores unfinished source and resumes without inference', async t => {
    const workspace = await fixture(t); let calls = 0;
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nif grep -q "TASK DONE" tasks/task.book; then exit 1; fi\n'); await chmod(hook, 0o755);
    const first = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement()(request); } });
    assert.equal(first.failed, 1); assert.equal(first.commits.length, 0);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID fixture/);
    await rm(hook);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { harness: 'openai-codex', runHarness: async () => { throw new Error('No model call during completion recovery'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(calls, 1);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('isolation preserves the single task result and integrates a Book task by fast-forward', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { isolate: true, harness: 'openai-codex', runHarness: implement('isolated\n') });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(result.failed, 0);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'isolated\n');
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE \d{4}-\d\d-\d\dT/);
    assert.equal(result.commits.length, 1);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('isolation respects the project Git checkout line-ending policy without changing the accepted blob', async t => {
    const workspace = await fixture(t, { autocrlf: true });
    const result = await runQueue(workspace, { isolate: true, harness: 'openai-codex', runHarness: implement('isolated\n') });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'isolated\r\n');
    assert.equal(await git(workspace.gitRoot, ['show', 'HEAD:code.txt']), 'isolated\n');
    assert.equal((await git(workspace.gitRoot, ['config', '--get', 'core.autocrlf'])).trim(), 'true');
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('a trace symlink escape never publishes done or writes outside the workspace', async t => {
    const workspace = await fixture(t); const outside = await mkdtemp(path.join(tmpdir(), 'ptbk-trace-target-'));
    t.after(() => rm(outside, { recursive: true, force: true }));
    await mkdir(workspace.statePath);
    await symlink(outside, path.join(workspace.statePath, 'traces'));
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 0); assert.equal(result.failed, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID fixture/);
    assert.match(result.events.find(event => event.type === 'error').message, /escapes/);
});

test('project secrets split across stream chunks are absent from output and durable traces', async t => {
    const workspace = await fixture(t); const secret = 'fixture-secret-value-837462';
    await writeFile(path.join(workspace.projectPath, '.env'), `SERVICE_PASSWORD=${secret}\n`);
    await writeFile(path.join(workspace.projectPath, '.gitignore'), '.ptbk/\n.env\nignored.txt\n');
    await git(workspace.gitRoot, ['add', '--', '.gitignore']); await git(workspace.gitRoot, ['commit', '-qm', 'Secret fixture']);
    let streamed = '';
    const result = await runQueue(workspace, { harness: 'openai-codex', onOutput: text => { streamed += text; }, runHarness: async request => {
        request.onOutput(secret.slice(0, 12)); request.onOutput(`${secret.slice(12)}\n`);
        return { outcome: 'success', exitCode: 0, output: `Printed ${secret}` };
    } });
    assert.equal(result.completed, 1); assert.ok(!streamed.includes(secret)); assert.ok(!JSON.stringify(result.events).includes(secret));
    const journal = (await readJournals(workspace))[0];
    assert.ok(!(await readFile(path.join(workspace.projectPath, journal.trace), 'utf8')).includes(secret));
});

test('validation setup placeholders and recursive script graphs fail before a provider call', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.projectPath, 'package.json'), JSON.stringify({ scripts: { check: 'npm run nested', nested: 'npm run check' } }));
    await git(workspace.gitRoot, ['add', '--', 'package.json']); await git(workspace.gitRoot, ['commit', '-qm', 'Recursive fixture']);
    await assert.rejects(fixChecks(workspace, { runHarness: async () => { throw new Error('No inference'); } }), /recursive/);
});

test('assume-unchanged user edits remain protected despite being hidden by git diff', async t => {
    const workspace = await fixture(t);
    await git(workspace.gitRoot, ['update-index', '--assume-unchanged', '--', 'code.txt']);
    await writeFile(path.join(workspace.projectPath, 'code.txt'), 'hidden user change\n');
    const before = await captureSnapshot(workspace.gitRoot);
    assert.ok(before.dirtyPaths.includes('code.txt'));
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement(), gitChanges: 'ignore' });
    assert.equal(result.failed, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'hidden user change\n');
    assert.match(await git(workspace.gitRoot, ['ls-files', '-v', '--', 'code.txt']), /^h /);
});

test('a hook-modified private index commit is retained but cannot publish completion or resume unchecked', async t => {
    const workspace = await fixture(t);
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nblob=$(printf "hook version\\n" | git hash-object -w --stdin)\ngit update-index --cacheinfo 100644 "$blob" code.txt\n'); await chmod(hook, 0o755);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 0); assert.equal(result.failed, 1); assert.equal(result.commits.length, 1);
    assert.equal(await git(workspace.gitRoot, ['show', 'HEAD:code.txt']), 'hook version\n');
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'agent\n');
    await rm(hook);
    await assert.rejects(recoverTask(workspace, 'fixture', { action: 'resume' }), /differs from the captured intent/);
});

test('legacy task identity stays stable across isolation remapping', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.legacyPath, 'legacy.md'), '[ ]\nLegacy implementation\n\nImplement the legacy fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Legacy task']);
    const before = (await discoverTasks(workspace))[0];
    const result = await runQueue(workspace, { isolate: true, harness: 'openai-codex', runHarness: implement('legacy isolated\n') });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    const after = (await discoverTasks(workspace))[0]; assert.equal(after.id, before.id); assert.equal(after.status, 'done');
});

test('fix with its default check always rechecks and cannot silently complete after a failed repair', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), 'process.exit(1);\n');
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Default failing validation']);
    let calls = 0;
    const result = await fixChecks(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement(`repair ${calls}\n`)(request); } });
    assert.equal(calls, 3); assert.equal(result.completed, 0); assert.equal(result.failed, 1);
});

test('future-only run does not require Git author identity or prepare an agent', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'TASK Future\n\nTASK ID fixture\nTASK AFTER 2099-01-01T00:00:00Z\n\nWait.\n');
    await rm(path.join(workspace.projectPath, 'agents/developer.book'));
    await git(workspace.gitRoot, ['add', '--', 'tasks/task.book', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Deferred fixture']);
    await git(workspace.gitRoot, ['config', '--unset', 'user.name']); await git(workspace.gitRoot, ['config', '--unset', 'user.email']);
    const result = await runQueue(workspace, { now: () => 0, runHarness: async () => { throw new Error('No inference for a future task'); } });
    assert.equal(result.completed, 0); assert.equal(result.exitCode, 0); assert.ok(result.nextWakeUp);
    assert.ok(!result.events.some(event => event.type === 'git-identity'));
});

test('interruption after completion persistence reconciles from Git without rerunning the model', async t => {
    const workspace = await fixture(t);
    assert.equal((await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() })).completed, 1);
    const journal = (await readJournals(workspace))[0];
    journal.phase = 'completion-ready';
    await writeJournal(workspace, journal);
    const ledger = await readLedger(workspace);
    ledger.tasks.fixture.claim = { id: journal.occurrenceId, runId: journal.id, slot: journal.dueSlot, startedAt: journal.startedAt };
    await saveLedger(workspace, ledger);
    const result = await recoverTask(workspace, 'fixture', { action: 'resume' }, { runHarness: async () => { throw new Error('Completed inference must not repeat'); } });
    assert.equal(result.completed, 1); assert.equal(result.commits.length, 0);
    assert.equal((await readJournals(workspace))[0].phase, 'completed'); assert.equal((await readLedger(workspace)).tasks.fixture.claim, undefined);
});

test('rejected push preserves local completion and recovery retries only synchronization', async t => {
    const workspace = await fixture(t); const remote = await mkdtemp(path.join(tmpdir(), 'ptbk-engine-remote-'));
    t.after(() => rm(remote, { recursive: true, force: true }));
    await git(remote, ['init', '--bare', '--quiet']); await git(workspace.gitRoot, ['remote', 'add', 'origin', remote]);
    await git(workspace.gitRoot, ['push', '-u', 'origin', 'HEAD']);
    const hook = path.join(remote, 'hooks/pre-receive'); await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    const first = await runQueue(workspace, { harness: 'openai-codex', autoPush: true, runHarness: implement() });
    assert.equal(first.completed, 1); assert.equal(first.syncPending, true); assert.equal(first.exitCode, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE \d{4}-\d\d-\d\dT/);
    await rm(hook);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { runHarness: async () => { throw new Error('No inference for push recovery'); } });
    assert.equal(resumed.exitCode, 0); assert.equal((await readJournals(workspace))[0].syncPending, undefined);
});

test('Claude quota recovery resumes one session in the same private checkout and counts usage once', async t => {
    const workspace = await fixture(t); let calls = 0; let firstPath;
    const result = await runQueue(workspace, { harness: 'claude-code', waitAfterError: 0, runHarness: async request => {
        calls++;
        if (calls === 1) {
            firstPath = request.projectPath;
            await writeFile(path.join(request.projectPath, 'code.txt'), 'partial Claude progress\n');
            return { outcome: 'quota', exitCode: 1, output: 'Usage limit reached', sessionId: 'fixture-claude-session', usage: { tokens: 10 } };
        }
        assert.equal(request.sessionId, 'fixture-claude-session'); assert.equal(request.projectPath, firstPath);
        assert.equal(await readFile(path.join(request.projectPath, 'code.txt'), 'utf8'), 'partial Claude progress\n');
        await writeFile(path.join(request.projectPath, 'code.txt'), 'Claude finished\n');
        return { outcome: 'success', exitCode: 0, output: 'Resumed and finished', sessionId: 'fixture-claude-session', usage: { tokens: 20 } };
    } });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.equal(calls, 2);
    const journal = (await readJournals(workspace))[0]; assert.equal(journal.attempts, 1); assert.equal(journal.usage.tokens, 30);
    assert.ok(result.events.some(event => event.type === 'quota-wait'));
});

test('Claude quota without a proven session cannot replay the task automatically', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'claude-code', waitAfterError: 0, runHarness: async () => { calls++; return { outcome: 'quota', exitCode: 1, output: 'Usage limit reached' }; } });
    assert.equal(calls, 1); assert.equal(result.completed, 0); assert.equal(result.failed, 1);
});

test('Claude usage-limit recovery remains bounded to one initial call plus three continuations', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'claude-code', waitAfterError: 0, runHarness: async () => { calls++; return { outcome: 'quota', exitCode: 1, output: 'Usage limit reached', sessionId: 'fixture-claude-session' }; } });
    assert.equal(calls, 4); assert.equal(result.completed, 0); assert.equal(result.failed, 1);
});

test('stop during pacing leaves the next task unclaimed and clears the wait indicator', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'TASK Second\n\nTASK ID second\nTASK PRIORITY 1\n\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/second.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Pacing fixture']);
    let stopped = false; let calls = 0; const waiting = [];
    const result = await runQueue(workspace, { harness: 'openai-codex', now: () => 0, waitBetweenPrompts: 1000,
        shouldStop: () => stopped, onWait: active => waiting.push(active), sleep: async () => { stopped = true; },
        runHarness: async request => { calls++; return implement()(request); },
    });
    assert.equal(calls, 1); assert.equal(result.completed, 1); assert.deepEqual(waiting, [true, false]);
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /TASK ID /);
    assert.equal((await readLedger(workspace)).tasks.second, undefined);
});

test('stop during an initial pause cannot claim a task or start a provider', async t => {
    const workspace = await fixture(t); let stopped = false;
    const result = await runQueue(workspace, { harness: 'openai-codex', isPaused: () => true, shouldStop: () => stopped,
        sleep: async () => { stopped = true; }, runHarness: async () => { throw new Error('No inference after stop'); },
    });
    assert.equal(result.completed, 0); assert.equal(result.exitCode, 0); assert.equal((await readJournals(workspace)).length, 0);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID /);
});

test('Claude recovery respects a provider reset timestamp before continuing the same session', async t => {
    const workspace = await fixture(t); let now = 1000; let waited = 0; let calls = 0;
    const result = await runQueue(workspace, { harness: 'claude-code', now: () => now, waitAfterError: 10000,
        sleep: async duration => { waited += duration; now += duration; }, runHarness: async request => {
            calls++;
            if (calls === 1) return { outcome: 'quota', exitCode: 1, output: 'Usage limit reached', sessionId: 'reset-session', quotaResetAt: 1100 };
            assert.equal(request.sessionId, 'reset-session'); return implement()(request);
        },
    });
    assert.equal(calls, 2); assert.equal(waited, 100); assert.equal(result.completed, 1);
});

test('the last agent MODEL supplies the provider model unless the task overrides it', async t => {
    const workspace = await fixture(t); const models = [];
    await writeFile(path.join(workspace.projectPath, 'agents/developer.book'), 'Developer\n\nFROM VOID\nMODEL original-model\nMODEL final-model\nGOAL Implement the fixture task.\nCLOSED\n');
    await git(workspace.gitRoot, ['add', '--', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Agent model fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { models.push(request.model); return implement()(request); } });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.deepEqual(models, ['final-model']);
    assert.equal((await readJournals(workspace))[0].model, 'final-model');
});

test('read-only readiness and execution match RUNNER against the local inherited agent model', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'agents/foundation.book'), 'Foundation\n\nFROM Void\nMODEL gpt-5\nCLOSED\n');
    await writeFile(path.join(workspace.projectPath, 'agents/developer.book'), 'Developer\n\nFROM ./foundation.book\nGOAL Implement the fixture task.\nCLOSED\n');
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'TASK Fixture implementation\n\nTASK ID fixture\nTASK RUNNER gpt\n\nImplement the fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'agents', 'tasks']); await git(workspace.gitRoot, ['commit', '-qm', 'Inherited model routing fixture']);
    const task = (await discoverTasks(workspace))[0];
    const readiness = await taskEligibility(workspace, task, { harness: 'openai-codex' }, { tasks: {} });
    assert.equal(readiness.kind, 'ready', readiness.reason);
    await assert.rejects(access(workspace.statePath));
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => {
        assert.equal(request.model, 'gpt-5'); return implement()(request);
    } });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
});

test('continue resumes one occurrence then processes the clean queue without repeating its recurring definition', async t => {
    const workspace = await fixture(t); let now = 1000; let calls = 0;
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'TASK Recurring\n\nTASK ID fixture\nTASK PRIORITY 2\nTASK AFTER 1970-01-01T00:00:00Z\nTASK REPEAT 1s\n\nReview.\n');
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'TASK Second\n\nTASK ID second\nTASK PRIORITY 1\n\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks']); await git(workspace.gitRoot, ['commit', '-qm', 'Continuation fixture']);
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    const options = { harness: 'openai-codex', now: () => now, runHarness: async request => { calls++; return implement(`implementation ${calls}\n`)(request); } };
    assert.equal((await runQueue(workspace, options)).failed, 1);
    await rm(hook); now = 10000;
    const result = await runQueue(workspace, { ...options, gitChanges: 'continue', limit: 2 });
    assert.equal(result.completed, 2, JSON.stringify(result.events)); assert.equal(calls, 2);
    assert.equal(result.events.filter(event => event.type === 'git-identity').length, 1);
    assert.equal((await readLedger(workspace)).tasks.fixture.history.length, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /TASK DONE \d{4}-\d\d-\d\dT/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('continue counts the recovered task toward the finite limit', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'TASK Second\n\nTASK ID second\nTASK PRIORITY 1\n\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/second.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Limited continuation fixture']);
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit'); await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    assert.equal((await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() })).failed, 1);
    await rm(hook);
    const result = await runQueue(workspace, { gitChanges: 'continue', limit: 1, runHarness: async () => { throw new Error('Limit must prevent the next model call'); } });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /TASK ID /);
    assert.equal((await readLedger(workspace)).tasks.second, undefined);
});

test('no-auto fix can save approved checker changes while declined repair creates no task claim or inference', async t => {
    const workspace = await fixture(t, { empty: true }); const confirmations = [];
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','checker delta\\n');process.exit(1);\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Interactive fix fixture']);
    const result = await fixChecks(workspace, { noAuto: true, confirm: async step => { confirmations.push(step); return step === 'commit'; },
        runHarness: async () => { throw new Error('Declined repair cannot invoke a provider'); },
    });
    assert.equal(result.failed, 1); assert.equal(result.completed, 0); assert.equal(result.commits.length, 0);
    assert.deepEqual(confirmations, ['task']); assert.deepEqual((await readLedger(workspace)).tasks, {});
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'checker delta\n');
    assert.ok((await readJournals(workspace)).every(journal => journal.phase === 'failed'));
});

test('no-auto check-before uses the same repair approval boundary', async t => {
    const workspace = await fixture(t); const confirmations = [];
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), 'process.exit(1);\n');
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Interactive check-before fixture']);
    const result = await runQueue(workspace, { noAuto: true, checkBefore: 'yes-and-fix', confirm: async step => { confirmations.push(step); return step === 'commit'; },
        runHarness: async () => { throw new Error('Declined check repair cannot invoke a provider'); },
    });
    assert.equal(result.failed, 1); assert.deepEqual(confirmations, ['task']);
    assert.deepEqual((await readLedger(workspace)).tasks, {});
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK ID /);
});

test('recover retry no-auto preserves the failed occurrence when task approval is declined', async t => {
    const workspace = await fixture(t); const confirmations = []; let calls = 0;
    const failed = await runQueue(workspace, { harness: 'openai-codex', runHarness: async () => {
        calls++; return { outcome: 'process-failure', exitCode: 1, output: 'Fixture failed before progress.' };
    } });
    assert.equal(failed.failed, 1);
    const beforeLedger = await readLedger(workspace); const beforeJournals = await readJournals(workspace);
    const result = await recoverTask(workspace, 'fixture', { action: 'retry' }, { noAuto: true,
        confirm: async step => { confirmations.push(step); return false; },
        runHarness: async () => { calls++; throw new Error('Declined replay must not call a provider'); },
    });
    assert.equal(calls, 1); assert.equal(result.skipped, 1); assert.equal(result.completed, 0); assert.deepEqual(confirmations, ['task']);
    assert.deepEqual(await readLedger(workspace), beforeLedger); assert.deepEqual(await readJournals(workspace), beforeJournals);
});

test('Markdown completion and trace evidence use one result commit and ignored runtime files', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.legacyPath, 'legacy.md'), '[ ]\nLegacy implementation\nImplement the fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Legacy fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.equal(result.commits.length, 1);
    const journal = (await readJournals(workspace))[0];
    assert.match(journal.trace, /^\.ptbk\/traces\//); assert.match(await readFile(path.join(workspace.projectPath, journal.trace), 'utf8'), /Legacy implementation/);
    assert.doesNotMatch(await git(workspace.gitRoot, ['ls-tree', '-r', '--name-only', 'HEAD']), /\.ptbk|prompts\/traces/);
    assert.equal((await discoverTasks(workspace))[0].status, 'done');
});

test('durable traces identify the selected agent, source snapshot, check and chronological retry reasons', async t => {
    const workspace = await fixture(t); const selected = (await discoverTasks(workspace))[0]; let calls = 0;
    const command = 'node -e "process.exit(0)"';
    const result = await runQueue(workspace, { harness: 'openai-codex', check: command, waitAfterError: 0, runHarness: async request => {
        calls++;
        if (calls === 1) return { outcome: 'transient', exitCode: 1, output: 'Temporary provider outage', usage: { tokens: 3 } };
        await writeFile(path.join(request.projectPath, 'code.txt'), 'Successful retry\n');
        return { outcome: 'success', exitCode: 0, output: 'Completed after retry', authentication: 'account', effectiveModel: 'reported-model', usage: { tokens: 4 } };
    } });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); const journal = (await readJournals(workspace))[0];
    assert.equal(journal.sourceSnapshot.revision, selected.source.revision); assert.equal(journal.agent, await realpath(path.join(workspace.projectPath, 'agents/developer.book')));
    assert.equal(journal.attemptHistory.length, 2); assert.equal(journal.attemptHistory[0].retry, 0); assert.equal(journal.attemptHistory[1].retry, 1);
    assert.match(journal.attemptHistory[0].reason, /Temporary provider outage/); assert.match(journal.attemptHistory[0].retryReason, /unchanged private content/);
    assert.equal(journal.usage.tokens, 7);
    const body = await readFile(path.join(workspace.projectPath, journal.trace), 'utf8');
    assert.ok(body.includes(`Run/journal: ${journal.id}`)); assert.ok(body.includes(`Source snapshot SHA-256: ${selected.source.revision}`));
    assert.ok(body.includes(`Agent: ${journal.agent}`)); assert.ok(body.includes(`Check command: ${command}`));
    assert.match(body, /Payload SHA-256: [a-f0-9]{64}/); assert.match(body, /Model: reported-model/); assert.match(body, /Temporary provider outage/);
    assert.match(body, /Record: finalization boundary/); assert.ok(body.includes(`Ptbk-Journal: ${journal.id}`));
});

test('aggregate provider and checker output stays within two MiB of valid UTF-8', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "process.stdout.write('validated\\n');\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Output retention checker']);
    const result = await runQueue(workspace, { harness: 'openai-codex', check: 'node check.cjs',
        runHarness: async () => ({ outcome: 'success', exitCode: 0, output: '🐙'.repeat(600000) }),
    });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); const journal = (await readJournals(workspace))[0];
    assert.ok(Buffer.byteLength(journal.output) <= 2 * 1024 * 1024); assert.ok(journal.output.endsWith('validated\n'));
    assert.match(journal.output, /^\[ptbk\] Earlier output truncated/);
    assert.ok(!journal.output.includes('\ufffd'));
});


test('OPEN produces one discoverable Teacher follow-up inside the original result commit', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'agents/developer.book'), 'Developer\nFROM VOID\nGOAL Implement the fixture.\nOPEN Learn new knowledge without changing rules.\n');
    await git(workspace.gitRoot, ['add', '--', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Open policy']);
    const result = await runQueue(workspace, { limit: 1, harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.equal(result.commits.length, 1);
    const tasks = await discoverTasks(workspace); const learning = tasks.find(task => task.id.startsWith('teach-'));
    assert.ok(learning); assert.equal(learning.agent, 'Teacher'); assert.equal(learning.origin, 'engine:learning:fixture');
    assert.deepEqual(learning.dependencies, ['#fixture']); assert.equal(learning.status, 'todo');
    const journal = (await readJournals(workspace))[0];
    assert.equal(journal.followupPath, learning.source.relativePath); assert.ok(!journal.followupPath.includes('\\'));
    assert.ok(!journal.trace.includes('\\'));
    assert.match(await git(workspace.gitRoot, ['show', `HEAD:${learning.source.relativePath}`]), /Learning limits: Learn new knowledge without changing rules/);
    assert.match(await git(workspace.gitRoot, ['show', 'HEAD:tasks/task.book']), /TASK DONE/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('closing an agent protects it from already queued teaching and needs no inference', async t => {
    const workspace = await fixture(t);
    const source = path.join(workspace.projectPath, 'agents/developer.book');
    await writeFile(source, 'Developer\nFROM VOID\nOPEN\n');
    await git(workspace.gitRoot, ['add', '--', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Open policy']);
    assert.equal((await runQueue(workspace, { limit: 1, harness: 'openai-codex', runHarness: implement() })).completed, 1);
    const original = (await readJournals(workspace))[0];
    original.followupPath = original.followupPath.replace(/\//g, '\\');
    await writeJournal(workspace, original);
    await writeFile(source, 'Developer\nFROM VOID\nCLOSED\n');
    await git(workspace.gitRoot, ['add', '--', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Close policy']);
    const result = await runQueue(workspace, { limit: 1, agent: 'Teacher', harness: 'openai-codex', requireAcceptance: true, runHarness: async () => { throw new Error('A CLOSED target cannot trigger model teaching'); } });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.equal(result.commits.length, 1);
    assert.equal(await readFile(source, 'utf8'), 'Developer\nFROM VOID\nCLOSED\n');
    assert.ok(result.events.some(event => event.type === 'learning-skipped'));
    assert.equal((await discoverTasks(workspace)).filter(task => task.id.startsWith('teach-')).length, 1);
});

test('technical retries are shared across repairs and cannot multiply their paid-call budget', async t => {
    const workspace = await fixture(t); let calls = 0;
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), 'process.exit(1);\n');
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Failing check']);
    const result = await runQueue(workspace, { harness: 'openai-codex', check: 'npm run check', waitAfterError: 0, runHarness: async request => {
        calls++;
        if (calls !== 4) return { outcome: 'transient', exitCode: 1, output: 'Provider unavailable' };
        return implement()(request);
    } });
    assert.equal(calls, 5); assert.equal(result.failed, 1); assert.equal(result.commits.length, 0);
    const journal = (await readJournals(workspace))[0]; assert.equal(journal.technicalRetries, 3); assert.equal(journal.attemptHistory.length, 5);
    assert.doesNotMatch(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE/);
});

test('automatic acceptance requires actual requested-outcome evidence beyond a zero exit', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', requireAcceptance: true, runHarness: implement() });
    assert.equal(result.completed, 0); assert.equal(result.failed, 1); assert.equal(result.commits.length, 0);
    assert.ok(result.events.some(event => event.type === 'error' && /Missing requested-outcome evidence/.test(event.message)));
    assert.doesNotMatch(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE/);
});

test('recorded external effects forbid a blind transient retry even with unchanged local files', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', waitAfterError: 0, runHarness: async () => {
        calls++; return { outcome: 'transient', exitCode: 1, output: 'Connection lost after publishing', externalEffects: true };
    } });
    assert.equal(calls, 1); assert.equal(result.failed, 1); assert.equal((await readJournals(workspace))[0].externalEffects, true);
});

test('finite execution snapshots its existing agenda and leaves newly generated work pending', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => {
        calls++; await writeFile(path.join(request.projectPath, 'tasks/followup.book'), 'TASK Follow up\nTASK ID followup\n\nAnother bounded task.\n');
        return implement()(request);
    } });
    assert.equal(calls, 1); assert.equal(result.completed, 1);
    const followup = (await discoverTasks(workspace)).find(task => task.id === 'followup'); assert.equal(followup.status, 'todo');
    assert.match(await git(workspace.gitRoot, ['show', 'HEAD:tasks/followup.book']), /TASK Follow up/);
});

test('exact internal selection cannot consume a different higher priority task', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'selected.book'), 'TASK Selected task\nTASK ID selected\nTASK PRIORITY 1\n\nSelected assignment.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/selected.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Selected task']);
    const prompts = [];
    const result = await runQueue(workspace, { harness: 'openai-codex', onlyTaskId: 'selected', runHarness: async request => {
        prompts.push(request.prompt); return implement()(request);
    } });
    assert.equal(result.completed, 1); assert.equal(prompts.length, 1); assert.match(prompts[0], /Selected assignment/);
    assert.equal((await discoverTasks(workspace)).find(task => task.id === 'fixture').status, 'todo');
});

test('unintegrated isolated completion resumes fast-forward without repeating the accepted task', async t => {
    const workspace = await fixture(t); let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', isolate: true, runHarness: async request => {
        calls++; await writeFile(path.join(workspace.projectPath, 'code.txt'), 'Concurrent user work\n');
        return implement('Isolated accepted work\n')(request);
    } });
    assert.equal(result.completed, 0); assert.equal(result.failed, 1); assert.equal(result.commits.length, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'Concurrent user work\n');
    assert.doesNotMatch(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE/);
    const interrupted = (await readJournals(workspace))[0]; assert.equal(interrupted.safePhase, 'integrating'); assert.ok(interrupted.isolation);
    await writeFile(path.join(workspace.projectPath, 'code.txt'), 'initial\n');
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { runHarness: async () => { throw new Error('No inference during verified integration'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(calls, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'Isolated accepted work\n');
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE/);
    assert.equal((await readJournals(workspace))[0].phase, 'completed');
});

test('already integrated isolation recovers across Git checkout filters without accepting user edits or duplicating work', async t => {
    const workspace = await fixture(t, { autocrlf: true }); let calls = 0; let committed = false; let interrupted = false;
    const actualRename = filesystem.rename;
    filesystem.rename = async (source, destination) => {
        if (committed && !interrupted && destination === path.join(workspace.statePath, 'occurrences.json')) {
            interrupted = true; throw Object.assign(new Error('Simulated interruption after integration'), { code: 'EIO' });
        }
        return actualRename(source, destination);
    };
    let result;
    try {
        result = await runQueue(workspace, { harness: 'openai-codex', isolate: true,
            onEvent: event => { if (event.type === 'commit') committed = true; },
            runHarness: async request => { calls++; return implement('Accepted isolated result\n')(request); },
        });
    } finally { filesystem.rename = actualRename; }
    assert.equal(result.completed, 0); assert.equal(result.failed, 1); assert.equal(result.commits.length, 1); assert.ok(interrupted);
    const journal = (await readJournals(workspace))[0]; assert.ok(journal.isolation); assert.equal(journal.safePhase, 'integrating');
    assert.equal((await git(workspace.gitRoot, ['rev-parse', 'HEAD'])).trim(), result.commits[0]);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'Accepted isolated result\r\n');
    await writeFile(path.join(workspace.projectPath, 'code.txt'), 'Concurrent editor changes\r\n');
    await assert.rejects(recoverTask(workspace, 'fixture', { action: 'resume' }), /Integrated checkout changed before recovery/);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'Concurrent editor changes\r\n');
    await writeFile(path.join(workspace.projectPath, 'code.txt'), 'Accepted isolated result\r\n');
    await writeFile(path.join(workspace.projectPath, 'staged-user.txt'), 'Staged user work\n');
    await git(workspace.gitRoot, ['add', '--', 'staged-user.txt']);
    await assert.rejects(recoverTask(workspace, 'fixture', { action: 'resume' }), /Integrated checkout changed before recovery/);
    assert.match(await git(workspace.gitRoot, ['diff', '--cached', '--name-only']), /staged-user.txt/);
    await git(workspace.gitRoot, ['reset', '--', 'staged-user.txt']); await rm(path.join(workspace.projectPath, 'staged-user.txt'));
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { runHarness: async () => { assert.fail('Accepted inference must never repeat'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(resumed.failed, 0); assert.equal(resumed.commits.length, 0);
    assert.equal(calls, 1); assert.equal((await git(workspace.gitRoot, ['rev-parse', 'HEAD'])).trim(), result.commits[0]);
    assert.equal((await readJournals(workspace))[0].phase, 'completed'); assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('resume cannot turn exhausted unmet-outcome evidence into a successful completion', async t => {
    const workspace = await fixture(t); let calls = 0;
    const first = await runQueue(workspace, { harness: 'openai-codex', requireAcceptance: true, runHarness: async request => {
        calls++; await writeFile(path.join(request.projectPath, 'code.txt'), `Incomplete attempt ${calls}\n`);
        return { outcome: 'success', exitCode: 0, output: 'Requirements remain incomplete', acceptance: { satisfied: false, evidence: 'The requested behavior is still missing.' } };
    } });
    assert.equal(calls, 3); assert.equal(first.completed, 0); assert.equal(first.failed, 1);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { requireAcceptance: true, runHarness: async () => { throw new Error('No replay on resume'); } });
    assert.equal(resumed.completed, 0); assert.equal(resumed.failed, 1);
    assert.doesNotMatch(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /TASK DONE/);
    const retried = await recoverTask(workspace, 'fixture', { action: 'retry' }, { harness: 'openai-codex', requireAcceptance: true, runHarness: async request => {
        calls++; await implement()(request); return { outcome: 'success', exitCode: 0, output: 'Verified the implemented behavior', acceptance: { satisfied: true, evidence: 'The requested file now contains the expected implementation.' } };
    } });
    assert.equal(retried.completed, 1, JSON.stringify(retried.events)); assert.equal(calls, 4);
});


test('Git subprocess cancellation, timeout and output overflow are explicit bounded failures', async t => {
    const workspace = await fixture(t); const head = (await captureSnapshot(workspace.gitRoot)).head;
    const slow = ['-c', 'alias.ptbk-slow=!node -e "setTimeout(() => {}, 30000)"', 'ptbk-slow'];
    const started = Date.now();
    await assert.rejects(git(workspace.gitRoot, slow, { timeoutMs: 100 }), /timed out.*preserved/);
    assert.ok(Date.now() - started < 5000);
    const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 100);
    try { await assert.rejects(git(workspace.gitRoot, slow, { signal: abort.signal }), /cancelled.*preserved/); }
    finally { clearTimeout(timer); }
    await assert.rejects(git(workspace.gitRoot, ['-c', `alias.ptbk-loud=!node -e "process.stdout.write('x'.repeat(65536))"`, 'ptbk-loud'], { maxOutputBytes: 1024 }), /output exceeded.*preserved/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).head, head);
});

test('reaching a finite task limit returns at the safe boundary even when the terminal is paused', async t => {
    const workspace = await fixture(t); let paused = false;
    const result = await runQueue(workspace, { harness: 'openai-codex', limit: 1, isPaused: () => paused,
        onEvent: event => { if (event.type === 'completed') paused = true; }, runHarness: implement(),
        sleep: async () => { throw new Error('The completed finite invocation must not enter a paused posttask wait'); },
    });
    assert.equal(result.completed, 1); assert.equal(result.exitCode, 0);
});
