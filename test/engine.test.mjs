import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, symlink, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runQueue, fixChecks, recoverTask } from '../dist/coder/engine.js';
import { git, captureSnapshot, commitScoped } from '../dist/coder/git.js';
import { acquireLease, readLedger, readJournals, saveLedger, writeJournal } from '../dist/coder/state.js';
import { discoverTasks } from '../dist/coder/sources.js';

/** A local fixture has no provider credentials and no dependency on this repository. */
async function fixture(t, options = {}) {
    const root = await mkdtemp(path.join(tmpdir(), 'ptbk-engine-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await git(root, ['init', '--quiet']);
    await git(root, ['config', 'user.name', 'Fixture Coder']);
    await git(root, ['config', 'user.email', 'fixture@example.test']);
    await git(root, ['config', 'commit.gpgsign', 'false']);
    await mkdir(path.join(root, 'agents'));
    await mkdir(path.join(root, 'tasks'));
    await mkdir(path.join(root, 'prompts'));
    await writeFile(path.join(root, 'agents/developer.book'), 'Developer\n\nFROM VOID\nGOAL Implement the fixture task.\n');
    await writeFile(path.join(root, '.gitignore'), '.promptbook/\nnode_modules/\nignored.txt\n');
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { check: 'node check.cjs' } }));
    await writeFile(path.join(root, 'code.txt'), 'initial\n');
    if (!options.empty) await writeFile(path.join(root, 'tasks/task.book'), 'Fixture implementation\n\nTASK\nMETA ID fixture\nSTATUS todo\nPRIORITY 2\n\nPROMPT\nImplement the fixture.\n');
    if (!options.unborn) { await git(root, ['add', '--', '.gitignore', 'agents', 'tasks', 'package.json', 'code.txt']); await git(root, ['commit', '-qm', 'Fixture baseline']); }
    return { projectPath: root, gitRoot: root, tasksPath: path.join(root, 'tasks'), legacyPath: path.join(root, 'prompts'), statePath: path.join(root, '.promptbook/ptbk-coder'), timezone: 'UTC' };
}

/** Deterministic success double writes only the selected checkout. */
function implement(content = 'agent\n') {
    return async request => { await writeFile(path.join(request.projectPath, 'code.txt'), content); return { outcome: 'success', exitCode: 0, output: 'Fixture completed.' }; };
}

test('one task uses phase commits and reports skipped validation honestly', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1);
    assert.equal(result.exitCode, 0);
    assert.equal(result.commits.length, 2);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS done/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
    assert.ok(result.events.some(event => event.type === 'checks-skipped'));
    assert.match(await git(workspace.gitRoot, ['show', `${result.commits[0]}:tasks/task.book`]), /STATUS in-progress/);
});

test('private checks commit the checker version after the agent version on the same line', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','checker\\n');\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Fixture checker']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement(), check: 'npm run check' });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(result.commits.length, 3);
    assert.equal(await git(workspace.gitRoot, ['show', `${result.commits[0]}:code.txt`]), 'agent\n');
    assert.equal(await git(workspace.gitRoot, ['show', `${result.commits[1]}:code.txt`]), 'checker\n');
    assert.match(await git(workspace.gitRoot, ['show', '-s', '--format=%B', result.commits[1]]), /Outcome: passed/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
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
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS in-progress/);
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
    assert.match(subjects, /Automatically commit changes made by checks/);
    assert.match(await git(workspace.gitRoot, ['log', '--format=%B']), /Outcome: failed/);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS in-progress/);
});

test('healthy fix needs neither a harness nor a Developer Book and commits formatter delta', async t => {
    const workspace = await fixture(t, { empty: true });
    await rm(path.join(workspace.projectPath, 'agents/developer.book'));
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','formatted\\n');\n");
    await git(workspace.gitRoot, ['add', '--', 'agents', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Healthy fixture']);
    const result = await fixChecks(workspace, { runHarness: async () => { throw new Error('Must not call a model'); } });
    assert.equal(result.exitCode, 0);
    assert.equal(result.completed, 0);
    assert.equal(result.commits.length, 1);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'formatted\n');
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('dry-run with future tasks is read-only and cannot invoke a provider', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'Future\n\nTASK\nMETA ID fixture\nSTATUS todo\nAFTER 2099-01-01T00:00:00Z\nPROMPT\nWait.\n');
    const result = await runQueue(workspace, { dryRun: true, now: () => 0, runHarness: async () => { throw new Error('No inference in preview'); } });
    assert.equal(result.nextWakeUp, Date.parse('2099-01-01T00:00:00Z'));
    await assert.rejects(access(workspace.statePath), { code: 'ENOENT' });
});

test('recurrence is coalesced and runs at most once per invocation, preserving todo', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'Recurring\n\nTASK\nMETA ID fixture\nSTATUS todo\nAFTER 2020-01-01T00:00:00Z\nREPEAT 1w\nPROMPT\nReview.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/task.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Recurring fixture']);
    let calls = 0; let now = Date.parse('2026-01-02T00:00:00Z');
    const options = { harness: 'openai-codex', now: () => now, runHarness: async request => { calls++; return implement(`review ${calls}\n`)(request); } };
    assert.equal((await runQueue(workspace, options)).completed, 1);
    assert.equal((await runQueue(workspace, options)).completed, 0);
    assert.equal(calls, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS todo/);
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
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS in-progress/);
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

test('a failed implementation commit resumes persistence without repeating successful inference', async t => {
    const workspace = await fixture(t); let calls = 0;
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    const first = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement()(request); } });
    assert.equal(first.completed, 0); assert.equal(first.failed, 1);
    await rm(hook);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { harness: 'openai-codex', runHarness: async () => { throw new Error('Must not repeat model'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(calls, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS done/);
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
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'Second\n\nTASK\nMETA ID second\nSTATUS todo\nPROMPT\nImplement second.\n');
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
    assert.match(await git(workspace.gitRoot, ['ls-tree', 'HEAD', '--', 'linked', 'run.sh']), /120000 blob[\s\S]*100755 blob/);
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

test('completion commit failure restores in-progress and resumes without inference', async t => {
    const workspace = await fixture(t); let calls = 0;
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit');
    await writeFile(hook, '#!/bin/sh\nif grep -q "STATUS done" tasks/task.book; then exit 1; fi\n'); await chmod(hook, 0o755);
    const first = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement()(request); } });
    assert.equal(first.failed, 1); assert.equal(first.commits.length, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS in-progress/);
    await rm(hook);
    const resumed = await recoverTask(workspace, 'fixture', { action: 'resume' }, { harness: 'openai-codex', runHarness: async () => { throw new Error('No model call during completion recovery'); } });
    assert.equal(resumed.completed, 1, JSON.stringify(resumed.events)); assert.equal(calls, 1);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('isolation preserves phase history and integrates a Book task by fast-forward', async t => {
    const workspace = await fixture(t);
    const result = await runQueue(workspace, { isolate: true, harness: 'openai-codex', runHarness: implement('isolated\n') });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(result.failed, 0);
    assert.equal(await readFile(path.join(workspace.projectPath, 'code.txt'), 'utf8'), 'isolated\n');
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS done/);
    assert.equal(result.commits.length, 2);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('a trace symlink escape never publishes done or writes outside the workspace', async t => {
    const workspace = await fixture(t); const outside = await mkdtemp(path.join(tmpdir(), 'ptbk-trace-target-'));
    t.after(() => rm(outside, { recursive: true, force: true }));
    await symlink(outside, path.join(workspace.tasksPath, 'traces'));
    await git(workspace.gitRoot, ['add', '--', 'tasks/traces']); await git(workspace.gitRoot, ['commit', '-qm', 'Trace fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 0); assert.equal(result.failed, 1);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS in-progress/);
    assert.match(result.events.find(event => event.type === 'error').message, /escapes/);
});

test('project secrets split across stream chunks are absent from output and durable traces', async t => {
    const workspace = await fixture(t); const secret = 'fixture-secret-value-837462';
    await writeFile(path.join(workspace.projectPath, '.env'), `SERVICE_PASSWORD=${secret}\n`);
    await writeFile(path.join(workspace.projectPath, '.gitignore'), '.promptbook/\n.env\nignored.txt\n');
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
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'Future\n\nTASK\nMETA ID fixture\nSTATUS todo\nAFTER 2099-01-01T00:00:00Z\nPROMPT\nWait.\n');
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
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS done/);
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
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'Second\n\nTASK\nMETA ID second\nSTATUS todo\nPRIORITY 1\nPROMPT\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/second.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Pacing fixture']);
    let stopped = false; let calls = 0; const waiting = [];
    const result = await runQueue(workspace, { harness: 'openai-codex', now: () => 0, waitBetweenPrompts: 1000,
        shouldStop: () => stopped, onWait: active => waiting.push(active), sleep: async () => { stopped = true; },
        runHarness: async request => { calls++; return implement()(request); },
    });
    assert.equal(calls, 1); assert.equal(result.completed, 1); assert.deepEqual(waiting, [true, false]);
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /STATUS todo/);
    assert.equal((await readLedger(workspace)).tasks.second, undefined);
});

test('stop during an initial pause cannot claim a task or start a provider', async t => {
    const workspace = await fixture(t); let stopped = false;
    const result = await runQueue(workspace, { harness: 'openai-codex', isPaused: () => true, shouldStop: () => stopped,
        sleep: async () => { stopped = true; }, runHarness: async () => { throw new Error('No inference after stop'); },
    });
    assert.equal(result.completed, 0); assert.equal(result.exitCode, 0); assert.equal((await readJournals(workspace)).length, 0);
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS todo/);
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
    await writeFile(path.join(workspace.projectPath, 'agents/developer.book'), 'Developer\n\nFROM VOID\nMODEL original-model\nMODEL final-model\nGOAL Implement the fixture task.\n');
    await git(workspace.gitRoot, ['add', '--', 'agents/developer.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Agent model fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { models.push(request.model); return implement()(request); } });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); assert.deepEqual(models, ['final-model']);
    assert.equal((await readJournals(workspace))[0].model, 'final-model');
});

test('continue resumes one occurrence then processes the clean queue without repeating its recurring definition', async t => {
    const workspace = await fixture(t); let now = 1000; let calls = 0;
    await writeFile(path.join(workspace.tasksPath, 'task.book'), 'Recurring\nTASK\nMETA ID fixture\nSTATUS todo\nPRIORITY 2\nAFTER 1970-01-01T00:00:00Z\nREPEAT 1s\nPROMPT\nReview.\n');
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'Second\nTASK\nMETA ID second\nSTATUS todo\nPRIORITY 1\nPROMPT\nImplement second.\n');
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
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /STATUS done/);
    assert.equal((await captureSnapshot(workspace.gitRoot)).dirtyPaths.length, 0);
});

test('continue counts the recovered task toward the finite limit', async t => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'second.book'), 'Second\nTASK\nMETA ID second\nSTATUS todo\nPRIORITY 1\nPROMPT\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'tasks/second.book']); await git(workspace.gitRoot, ['commit', '-qm', 'Limited continuation fixture']);
    const hook = path.join(workspace.gitRoot, '.git/hooks/pre-commit'); await writeFile(hook, '#!/bin/sh\nexit 1\n'); await chmod(hook, 0o755);
    assert.equal((await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() })).failed, 1);
    await rm(hook);
    const result = await runQueue(workspace, { gitChanges: 'continue', limit: 1, runHarness: async () => { throw new Error('Limit must prevent the next model call'); } });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.match(await readFile(path.join(workspace.tasksPath, 'second.book'), 'utf8'), /STATUS todo/);
    assert.equal((await readLedger(workspace)).tasks.second, undefined);
});

test('no-auto fix can save approved checker changes while declined repair creates no task claim or inference', async t => {
    const workspace = await fixture(t, { empty: true }); const confirmations = [];
    await writeFile(path.join(workspace.projectPath, 'check.cjs'), "require('node:fs').writeFileSync('code.txt','checker delta\\n');process.exit(1);\n");
    await git(workspace.gitRoot, ['add', '--', 'check.cjs']); await git(workspace.gitRoot, ['commit', '-qm', 'Interactive fix fixture']);
    const result = await fixChecks(workspace, { noAuto: true, confirm: async step => { confirmations.push(step); return step === 'commit'; },
        runHarness: async () => { throw new Error('Declined repair cannot invoke a provider'); },
    });
    assert.equal(result.failed, 1); assert.equal(result.completed, 0); assert.equal(result.commits.length, 1);
    assert.deepEqual(confirmations, ['task', 'commit']); assert.deepEqual((await readLedger(workspace)).tasks, {});
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
    assert.equal(result.failed, 1); assert.deepEqual(confirmations, ['task', 'commit']);
    assert.deepEqual((await readLedger(workspace)).tasks, {});
    assert.match(await readFile(path.join(workspace.tasksPath, 'task.book'), 'utf8'), /STATUS todo/);
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

test('single-section Markdown retains the historical trace filename and an occurrence trace', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.legacyPath, 'legacy.name.md'), '[ ]\nLegacy implementation\nImplement the fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.name.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Legacy trace fixture']);
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: implement() });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    const journal = (await readJournals(workspace))[0];
    assert.equal(journal.legacyTrace, 'prompts/traces/legacy.name.md');
    assert.equal(await readFile(path.join(workspace.projectPath, journal.legacyTrace), 'utf8'), await readFile(path.join(workspace.projectPath, journal.trace), 'utf8'));
    assert.notEqual(journal.trace, journal.legacyTrace);
    assert.match(await git(workspace.gitRoot, ['show', `HEAD:${journal.legacyTrace}`]), /local completion persistence pending/);
});

test('multi-section Markdown trace suffixes preserve the historical nonempty section ordinals', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.legacyPath, 'multiple.md'), '---\n[ ] !\nFirst legacy section\nImplement first.\n---\n\n---\n[ ]\nSecond legacy section\nImplement second.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/multiple.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Multiple legacy traces']);
    let calls = 0;
    const result = await runQueue(workspace, { harness: 'openai-codex', runHarness: async request => { calls++; return implement(`section ${calls}\n`)(request); } });
    assert.equal(result.completed, 2, JSON.stringify(result.events));
    assert.match(await readFile(path.join(workspace.legacyPath, 'traces/multiple-1.md'), 'utf8'), /# First legacy section/);
    assert.match(await readFile(path.join(workspace.legacyPath, 'traces/multiple-2.md'), 'utf8'), /# Second legacy section/);
    assert.deepEqual((await readJournals(workspace)).map(journal => journal.legacyTrace).sort(), ['prompts/traces/multiple-1.md', 'prompts/traces/multiple-2.md']);
});

test('an unchanged coder-owned legacy latest trace updates while keeping the previous occurrence', async t => {
    const workspace = await fixture(t, { empty: true }); let now = 0;
    const source = path.join(workspace.legacyPath, 'legacy.md');
    await writeFile(source, '[ ]\nLegacy implementation\nImplement the fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Reusable legacy trace']);
    const options = { harness: 'openai-codex', now: () => now, runHarness: implement() };
    assert.equal((await runQueue(workspace, options)).completed, 1);
    const previous = (await readJournals(workspace))[0]; const previousBody = await readFile(path.join(workspace.projectPath, previous.trace), 'utf8');
    await writeFile(source, (await readFile(source, 'utf8')).replace('[x]', '[ ]'));
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Explicitly repeat legacy task']); now = 1000;
    assert.equal((await runQueue(workspace, options)).completed, 1);
    const latest = (await readJournals(workspace)).find(journal => journal.startedAt === now);
    assert.equal(await readFile(path.join(workspace.projectPath, previous.trace), 'utf8'), previousBody);
    assert.notEqual(await readFile(path.join(workspace.projectPath, latest.legacyTrace), 'utf8'), previousBody);
    assert.equal(await readFile(path.join(workspace.projectPath, latest.legacyTrace), 'utf8'), await readFile(path.join(workspace.projectPath, latest.trace), 'utf8'));
});

test('an existing user legacy trace is preserved and excluded from completion persistence', async t => {
    const workspace = await fixture(t, { empty: true });
    await writeFile(path.join(workspace.legacyPath, 'legacy.md'), '[ ]\nLegacy implementation\nImplement the fixture.\n');
    await mkdir(path.join(workspace.legacyPath, 'traces')); const legacy = path.join(workspace.legacyPath, 'traces/legacy.md');
    await writeFile(legacy, 'Committed user trace\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts']); await git(workspace.gitRoot, ['commit', '-qm', 'User legacy trace']);
    await writeFile(legacy, 'Uncommitted user trace\n');
    const result = await runQueue(workspace, { harness: 'openai-codex', gitChanges: 'ignore', runHarness: implement() });
    assert.equal(result.completed, 1, JSON.stringify(result.events));
    assert.equal(await readFile(legacy, 'utf8'), 'Uncommitted user trace\n');
    assert.equal(await git(workspace.gitRoot, ['show', 'HEAD:prompts/traces/legacy.md']), 'Committed user trace\n');
    assert.ok(result.events.some(event => event.type === 'trace-preserved'));
    const journal = (await readJournals(workspace))[0]; assert.ok(journal.trace); assert.equal(journal.legacyTrace, undefined);
});

test('a concurrent edit while refreshing an owned legacy latest trace is preserved', async t => {
    const workspace = await fixture(t, { empty: true }); let now = 0;
    const source = path.join(workspace.legacyPath, 'legacy.md'); const alias = path.join(workspace.legacyPath, 'traces/legacy.md');
    await writeFile(source, '[ ]\nLegacy implementation\nImplement the fixture.\n');
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Concurrent legacy trace']);
    const options = { harness: 'openai-codex', now: () => now, runHarness: implement() };
    assert.equal((await runQueue(workspace, options)).completed, 1);
    await writeFile(source, (await readFile(source, 'utf8')).replace('[x]', '[ ]'));
    await git(workspace.gitRoot, ['add', '--', 'prompts/legacy.md']); await git(workspace.gitRoot, ['commit', '-qm', 'Repeat trace fixture']); now = 1000;
    const filesystem = await import('node:fs/promises'); const originalWrite = filesystem.default.writeFile;
    let edited = false;
    filesystem.default.writeFile = async function(filename, ...arguments_) {
        const result = await originalWrite.call(this, filename, ...arguments_);
        if (!edited && String(filename).startsWith(`${alias}.`) && String(filename).endsWith('.tmp')) {
            edited = true; await originalWrite(alias, 'Concurrent user trace\n');
        }
        return result;
    };
    let result;
    try { result = await runQueue(workspace, options); } finally { filesystem.default.writeFile = originalWrite; }
    assert.equal(edited, true); assert.equal(result.completed, 0); assert.equal(result.failed, 1);
    assert.equal(await readFile(alias, 'utf8'), 'Concurrent user trace\n');
    assert.match(await readFile(source, 'utf8'), /\[\^\]/);
    assert.ok(result.events.some(event => event.type === 'error' && /changed while saving/.test(event.message)));
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
    const result = await runQueue(workspace, { harness: 'openai-codex', check: 'node -e "console.log(\'validated\')"',
        runHarness: async () => ({ outcome: 'success', exitCode: 0, output: '🐙'.repeat(600000) }),
    });
    assert.equal(result.completed, 1, JSON.stringify(result.events)); const journal = (await readJournals(workspace))[0];
    assert.ok(Buffer.byteLength(journal.output) <= 2 * 1024 * 1024); assert.ok(journal.output.endsWith('validated\n'));
    assert.match(journal.output, /^\[ptbk\] Earlier output truncated/);
    assert.ok(!journal.output.includes('\ufffd'));
});
