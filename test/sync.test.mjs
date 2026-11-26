import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { SyncCoordinator } from '../dist/engine/sync.js';
import { git, initRepository, initializedProject, ptbk, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * A bare origin with an initial commit on main and two clones (this engine's project and "another machine").
 */
async function remoteFixture(t) {
    const root = await temporaryDirectory(t, 'ptbk sync');
    const origin = join(root, 'origin.git');
    await mkdir(origin);
    await git(origin, ['init', '--bare', '--quiet', '--initial-branch=main']);
    const seed = join(root, 'seed');
    await initRepository(seed);
    await git(seed, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    await writeFile(join(seed, 'README.md'), 'shared\n');
    await git(seed, ['add', '-A']);
    await git(seed, ['commit', '-q', '-m', 'Initial']);
    await git(seed, ['remote', 'add', 'origin', origin]);
    await git(seed, ['push', '-q', '-u', 'origin', 'main']);
    const clone = async (name) => {
        const path = join(root, name);
        await git(root, ['clone', '-q', origin, path]);
        // Like initRepository: the coordinator's own Git must see the same line endings as the fixture's (no runner autocrlf).
        for (const [key, value] of [['user.name', 'Fixture Tester'], ['user.email', 'fixture@example.test'], ['commit.gpgsign', 'false'], ['core.autocrlf', 'false']]) await git(path, ['config', key, value]);
        return path;
    };
    return { root, origin, local: await clone('local'), other: await clone('other') };
}

/**
 * A coordinator over a local clone with recording hooks.
 */
function coordinator(local, overrides = {}) {
    const events = { conflicts: [], integrated: 0, logs: [] };
    let enabled = true;
    const sync = new SyncCoordinator({
        repositoryRoot: () => local,
        env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture Tester', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture Tester', GIT_COMMITTER_EMAIL: 'fixture@example.test' },
        gitLock: async (action) => await action(),
        enabled: () => enabled,
        integrationBlocker: async () => undefined,
        onConflict: async (conflict) => void events.conflicts.push(conflict),
        onIntegrated: async () => void events.integrated++,
        onChange: () => undefined,
        log: (text) => void events.logs.push(text),
        ...overrides,
    });
    return { sync, events, disable: () => (enabled = false) };
}

/**
 * Commits a file change in a clone and optionally pushes it.
 */
async function change(clone, file, content, message, push = true) {
    await writeFile(join(clone, file), content);
    await git(clone, ['add', '-A']);
    await git(clone, ['commit', '-q', '-m', message]);
    if (push) await git(clone, ['push', '-q', 'origin', 'HEAD:main']);
}

test('synchronization coordinator: visible merges, publication, no empty merges, truthful pre-commit deferral, conflicts to Fixer, backoff', async (t) => {
    const { local, other, origin } = await remoteFixture(t);
    let blocker;
    const { sync, events, disable } = coordinator(local, { integrationBlocker: async () => blocker });
    await sync.begin();
    t.after(() => sync.end());

    assert.equal((await sync.request('manual')).outcome, 'synchronized', 'nothing to do');
    const head = (await git(local, ['rev-parse', 'HEAD'])).trim();

    await change(other, 'remote.md', 'from another machine\n', 'Remote work');
    blocker = 'active work owns incoming files (remote.md)';
    const fetchOnly = await sync.request('pre-commit');
    assert.equal(fetchOnly.outcome, 'deferred', 'an unsafe pre-commit integration is deferred');
    assert.match(fetchOnly.message, /active work owns incoming files \(remote\.md\)\. The local commit proceeds/, 'with its actual reason');
    assert.equal((await git(local, ['rev-parse', 'HEAD'])).trim(), head, 'nothing was integrated before the local commit');
    assert.match(sync.view().reason, /active work owns incoming files/);
    blocker = undefined;
    const merged = await sync.request('boundary');
    assert.equal(merged.outcome, 'synchronized', merged.message);
    assert.equal(events.integrated, 1);
    const parents = (await git(local, ['log', '-1', '--format=%P'])).trim().split(' ');
    assert.equal(parents.length, 2, 'a visible merge commit even though fast-forward was possible');
    assert.equal((await git(local, ['log', '-1', '--format=%s'])).trim(), '`ptbk` `git.merge` - Merge origin/main into main');
    // The committed content, not the checkout: Windows Git may check text files out with CRLF (core.autocrlf).
    assert.equal(await git(local, ['show', 'HEAD:remote.md']), 'from another machine\n');
    assert.equal((await git(origin, ['rev-parse', 'main'])).trim(), (await git(local, ['rev-parse', 'HEAD'])).trim(), 'the merge was published');

    const before = (await git(local, ['rev-list', '--count', 'HEAD'])).trim();
    assert.equal((await sync.request('timer')).outcome, 'synchronized');
    assert.equal((await git(local, ['rev-list', '--count', 'HEAD'])).trim(), before, 'up-to-date input creates no empty merge');

    await change(local, 'local.md', 'local result\n', 'ptbk: Local result', false);
    assert.equal((await sync.request('post-commit')).outcome, 'synchronized');
    assert.equal((await git(origin, ['log', '-1', '--format=%s', 'main'])).trim(), 'ptbk: Local result', 'completed local work is published');

    // A genuine conflict leaves the branch and working tree untouched and goes to Fixer.
    await git(other, ['pull', '-q', 'origin', 'main']);
    await change(other, 'README.md', 'their version\n', 'Their edit');
    await change(local, 'README.md', 'our version\n', 'Our edit', false);
    const ours = (await git(local, ['rev-parse', 'HEAD'])).trim();
    const conflict = await sync.request('manual');
    assert.equal(conflict.outcome, 'conflict', conflict.message);
    assert.deepEqual(events.conflicts.map((item) => item.files), [['README.md']]);
    assert.equal((await git(local, ['rev-parse', 'HEAD'])).trim(), ours, 'no merge was committed');
    assert.equal((await git(local, ['status', '--porcelain'])).trim(), '', 'the sole working tree is not left half-merged');
    assert.notEqual((await git(local, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).catch(() => '')).trim().length, 40);
    assert.equal(sync.view().state, 'conflict');

    // Remote failures back off and never claim success; a manual cycle retries at once.
    await git(local, ['reset', '-q', '--hard', 'origin/main']);
    await git(local, ['remote', 'set-url', 'origin', join(origin, 'missing')]);
    const failed = await sync.request('boundary');
    assert.equal(failed.outcome, 'failed');
    assert.ok(sync.view().nextAttemptAt);
    assert.equal((await sync.request('timer')).outcome, 'skipped', 'automatic attempts back off');
    assert.equal((await sync.request('manual')).outcome, 'failed', 'a manual cycle is attempted immediately');
    assert.ok(events.logs.some((line) => /local work continues/.test(line)));

    disable();
    assert.equal((await sync.request('manual')).outcome, 'disabled');
    assert.equal(sync.view(), undefined, 'no synchronization view while autosync is off');
});

test('synchronization during Pause: no periodic cycles or retries, manual and commit boundaries still synchronize, periodic resumes after Resume', async (t) => {
    const { local, other, origin } = await remoteFixture(t);
    let paused = true;
    const { sync, events } = coordinator(local, { paused: () => paused, intervalMs: 40 });
    await sync.begin();
    t.after(() => sync.end());
    const tracked = async () => (await git(local, ['rev-parse', 'origin/main'])).trim();

    await change(other, 'remote.md', 'from another machine\n', 'Remote work');
    const before = await tracked();
    // Well beyond the (shortened) healthy interval: no timer cycle fetches while paused.
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(await tracked(), before, 'no periodic fetch during Pause');
    assert.equal(sync.view().nextAttemptAt, undefined, 'no periodic attempt is scheduled while paused');
    assert.match(sync.view().suspended, /Paused/);
    assert.equal((await sync.request('timer')).outcome, 'skipped');
    assert.equal((await sync.request('boundary')).outcome, 'skipped', 'an operation boundary without a commit starts no remote work');
    assert.equal(await tracked(), before);

    // A commit boundary: fetch and safe integration before the commit, publication after it.
    const fetched = await sync.request('pre-commit');
    assert.equal(fetched.outcome, 'pending', `the merge waits for publication after the local commit: ${fetched.message}`);
    assert.notEqual(await tracked(), before, 'the pre-commit attempt fetched');
    assert.equal(events.integrated, 1, 'remote work touching only unowned clean files was integrated before the local commit');
    await change(local, 'manual.md', 'saved while paused\n', 'ptbk: Manual save', false);
    const published = await sync.request('post-commit');
    assert.equal(published.outcome, 'synchronized', published.message);
    assert.equal((await git(origin, ['rev-parse', 'main'])).trim(), (await git(local, ['rev-parse', 'HEAD'])).trim(), 'the local commit was published');

    // Synchronize now stays available while paused.
    await change(other, 'second.md', 'more\n', 'More remote work', false);
    await git(other, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
    await git(other, ['push', '-q', 'origin', 'HEAD:main']);
    assert.equal((await sync.request('manual')).outcome, 'synchronized');
    assert.equal(events.integrated, 2);

    // A failed attempt's retry is timer-driven: it waits for Resume too.
    await git(local, ['remote', 'set-url', 'origin', join(origin, 'missing')]);
    await change(local, 'pending.md', 'pending\n', 'ptbk: Pending', false);
    assert.equal((await sync.request("post-commit")).outcome, "failed");
    const attempted = sync.view().lastAttemptAt;
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(sync.view().lastAttemptAt, attempted, 'no timer-driven retry during Pause');

    // Running again: the periodic cycle that came due during Pause runs once.
    await git(local, ['remote', 'set-url', 'origin', origin]);
    paused = false;
    assert.equal(sync.view().suspended, undefined);
    // The backoff still applies to the resumed periodic attempt; a manual cycle brings it forward.
    sync.resumed();
    assert.equal((await sync.request('manual')).outcome, 'synchronized');
    assert.equal((await git(origin, ['log', '-1', '--format=%s', 'main'])).trim(), 'ptbk: Pending');
    await change(other, 'third.md', 'after resume\n', 'After resume', false);
    await git(other, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
    await git(other, ['push', '-q', 'origin', 'HEAD:main']);
    await waitFor(async () => events.integrated === 3 || undefined, { message: 'the periodic cycle after Resume', timeoutMs: 10_000, intervalMs: 50 });
});

/**
 * A controllable clock for the periodic schedule: live intervals are counted and ticked by the test.
 */
function manualTimers() {
    const live = new Map();
    let next = 0;
    return {
        live,
        created: 0,
        setInterval(callback) {
            this.created++;
            const handle = ++next;
            live.set(handle, callback);
            return handle;
        },
        clearInterval(handle) {
            live.delete(handle);
        },
        async tick() {
            for (const callback of [...live.values()]) callback();
            await new Promise((resolve) => setTimeout(resolve, 0));
        },
    };
}

test('synchronization at a pre-commit boundary: unowned clean incoming files are merged before the local commit; owned edits or running validation defer truthfully and integrate later', async (t) => {
    const { local, other, origin } = await remoteFixture(t);
    let owned = [];
    let validating = false;
    const assessments = [];
    const { sync, events } = coordinator(local, {
        integrationBlocker: async (files, options) => {
            assessments.push({ files, locked: Boolean(options?.locked) });
            if (validating) return '"Fixture task" is validating or committing its result; integration happens after it';
            const overlap = files.filter((file) => owned.includes(file));
            return overlap.length ? `active work owns incoming files (${overlap.join(', ')}); integration happens once it releases them` : undefined;
        },
    });
    await sync.begin();
    t.after(() => sync.end());

    // Unrelated dirty work is not proof that integration is unsafe.
    await writeFile(join(local, 'draft.md'), 'unrelated uncommitted work\n');
    await change(other, 'remote.md', 'from another machine\n', 'Remote work');
    const integrated = await sync.request('pre-commit');
    assert.equal(integrated.outcome, 'pending', `integrated; publication follows the local commit: ${integrated.message}`);
    assert.equal(events.integrated, 1);
    assert.deepEqual(assessments.map((entry) => entry.locked), [false, true], 'assessed, then revalidated under the shared Git coordination');
    assert.equal((await git(local, ['log', '-1', '--format=%P'])).trim().split(' ').length, 2, 'a separate visible merge');
    assert.equal(await readFile(join(local, 'draft.md'), 'utf8'), 'unrelated uncommitted work\n', 'unrelated work is preserved');
    await change(local, 'chat.md', 'saved chat\n', 'ptbk: Chat batch', false);
    assert.equal((await git(local, ['log', '-1', '--format=%s', 'HEAD~1'])).trim(), '`ptbk` `git.merge` - Merge origin/main into main', 'the merge precedes the local operation commit');
    assert.equal((await sync.request('post-commit')).outcome, 'synchronized');
    assert.equal((await git(origin, ['log', '-1', '--format=%s', 'main'])).trim(), 'ptbk: Chat batch');

    // Overlapping owned edits: fetch finishes, integration is deferred with its reason, the scoped commit proceeds.
    await change(other, 'remote.md', 'their second version\n', 'Remote edit of an owned file', false);
    await git(other, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
    await git(other, ['push', '-q', 'origin', 'HEAD:main']);
    owned = ['remote.md'];
    const head = (await git(local, ['rev-parse', 'HEAD'])).trim();
    const deferred = await sync.request('pre-commit');
    assert.equal(deferred.outcome, 'deferred');
    assert.match(deferred.message, /active work owns incoming files \(remote\.md\)/);
    assert.equal((await git(local, ['rev-parse', 'HEAD'])).trim(), head);
    assert.notEqual((await git(local, ['rev-parse', 'origin/main'])).trim(), (await git(local, ['rev-parse', 'HEAD~0'])).trim(), 'a fetched upstream ref is evidence of fetch only');
    await change(local, 'scoped.md', 'scoped local work\n', 'ptbk: Scoped operation', false);
    owned = [];

    // Running validation also defers, even though no file is owned.
    validating = true;
    const checking = await sync.request('pre-commit');
    assert.equal(checking.outcome, 'deferred');
    assert.match(checking.message, /validating or committing its result/);
    validating = false;

    // The next permitted safe boundary integrates.
    const later = await sync.request('boundary');
    assert.equal(later.outcome, 'synchronized', later.message);
    assert.equal(events.integrated, 2);
    assert.equal(await git(local, ['show', 'HEAD:remote.md']), 'their second version\n');

    // Staged index entries and a failing assessment are uncertainty: the local work is preserved.
    await git(other, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
    await change(other, 'third.md', 'third\n', 'Third remote change');
    await writeFile(join(local, 'staged.md'), 'staged by the user\n');
    await git(local, ['add', 'staged.md']);
    const staged = await sync.request('pre-commit');
    assert.equal(staged.outcome, 'deferred');
    assert.match(staged.message, /staged changes in the index \(staged\.md\)/);
    await git(local, ['reset', '-q', 'staged.md']);
    const failing = coordinator(local, { integrationBlocker: async () => { throw new Error('ownership state is unreadable'); } });
    await failing.sync.begin();
    t.after(() => failing.sync.end());
    const uncertain = await failing.sync.request('pre-commit');
    assert.equal(uncertain.outcome, 'deferred');
    assert.match(uncertain.message, /could not be assessed \(ownership state is unreadable\)/);
    assert.equal(await readFile(join(local, 'staged.md'), 'utf8'), 'staged by the user\n');
});

test('synchronization timer lifecycle: no timer while disabled, toggling never duplicates the schedule or keeps queued automatic work', async (t) => {
    const { local, other } = await remoteFixture(t);
    const timers = manualTimers();
    let enabled = false;
    const { sync, events } = coordinator(local, { enabled: () => enabled, timers, intervalMs: 1_000 });
    const tracked = async () => (await git(local, ['rev-parse', 'origin/main'])).trim();

    await sync.begin();
    t.after(() => sync.end());
    assert.equal(sync.scheduled, false, 'starting disabled creates no timer, not even a dormant one');
    assert.equal(timers.live.size, 0);
    for (let index = 0; index < 3; index++) sync.refresh();
    assert.equal(timers.created, 0, 'configuration refreshes while disabled create no schedule');

    enabled = true;
    for (let index = 0; index < 3; index++) sync.refresh();
    assert.equal(sync.scheduled, true);
    assert.equal(timers.live.size, 1, 'repeated refresh or client attachment keeps exactly one schedule');
    await change(other, 'remote.md', 'from another machine\n', 'Remote work');
    await timers.tick();
    await waitFor(async () => events.integrated === 1 || undefined, { message: 'the periodic cycle discovers and integrates remote work', timeoutMs: 10_000, intervalMs: 20 });
    await waitFor(async () => (sync.view().phase === 'idle' && sync.view().outgoing === 0) || undefined, { message: 'the periodic cycle publishes its merge', timeoutMs: 10_000, intervalMs: 20 });

    // A pending retry: the origin fails, the schedule stays single, then synchronization is turned off.
    const originUrl = (await git(local, ['remote', 'get-url', 'origin'])).trim();
    await git(local, ['remote', 'set-url', 'origin', join(local, 'missing')]);
    assert.equal((await sync.request('manual')).outcome, 'failed');
    assert.ok(sync.view().nextAttemptAt, 'a retry is pending');
    enabled = false;
    sync.refresh();
    assert.equal(sync.scheduled, false, 'turning off cancels the timer');
    assert.equal(timers.live.size, 0);
    await git(local, ['remote', 'set-url', 'origin', originUrl]);
    await change(other, 'second.md', 'second\n', 'Second remote change', false);
    await git(other, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
    await git(other, ['push', '-q', 'origin', 'HEAD:main']);
    const before = await tracked();
    await timers.tick();
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(await tracked(), before, 'no queued automatic remote work after disable');
    assert.equal((await sync.request('boundary')).outcome, 'disabled');

    // An in-flight cycle settles safely when turned off meanwhile, and its queued follow-up is dropped.
    enabled = true;
    sync.refresh();
    const inFlight = sync.request('manual');
    void sync.request('timer');
    enabled = false;
    sync.refresh();
    await inFlight;
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(sync.scheduled, false);

    // Re-enabled: at most one schedule again; ending the engine removes it.
    enabled = true;
    sync.refresh();
    sync.refresh();
    assert.equal(timers.live.size, 1);
    const created = timers.created;
    sync.end();
    assert.equal(timers.live.size, 0, 'a stopped engine owns no schedule');
    sync.refresh();
    assert.equal(timers.created, created, 'no schedule is created while the engine is not running');
});

test('synchronization setup: init publishes to the supplied origin with autosync on; no-commit conflicts; the default stays local', async (t) => {
    const { origin } = await remoteFixture(t);
    const bare = join(origin, '..', 'project.git');
    await mkdir(bare);
    await git(bare, ['init', '--bare', '--quiet']);
    const { project, env, init } = await initializedProject(t, { initArgs: ['--auto-sync', '--origin-url', bare] });
    assert.equal(init.code, 0, init.output);
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.equal(config.isAutoSync, true);
    assert.equal(config.origin, undefined, 'the destination lives in Git, not in ptbk.json');
    // The fixture created the repository, so it keeps Git's default branch (existing branches are never switched).
    const branch = (await git(project, ['symbolic-ref', '--short', 'HEAD'])).trim();
    assert.equal((await git(project, ['remote', 'get-url', 'origin'])).trim(), bare);
    assert.equal((await git(project, ['rev-parse', '--abbrev-ref', '@{u}'])).trim(), `origin/${branch}`);
    assert.equal((await git(bare, ['log', '-1', '--format=%s', branch])).trim(), '`ptbk` `project.setup` - Initialize project', 'the committed local setup was published');
    assert.match(init.stdout, new RegExp(`Published ${branch} to origin`));

    const conflict = await ptbk(['init', '--non-interactive', '--no-commit', '--auto-sync', '--no-start', '--raw'], { cwd: project, env });
    assert.equal(conflict.code, 2, conflict.output);
    assert.match(conflict.output, /conflicts with automatic synchronization/);

    const local = await initializedProject(t);
    assert.equal(JSON.parse(await readFile(join(local.project, 'ptbk.json'), 'utf8')).isAutoSync, false, 'unattended init without a choice keeps synchronization off');
    assert.equal((await git(local.project, ['remote'])).trim(), '', 'no remote is added');
    const snapshot = JSON.parse((await ptbk(['status', '--json'], { cwd: local.project, env: local.env })).stdout || '{}');
    assert.equal(snapshot.sync, undefined);
});

test('engine synchronization: remote work is integrated at an operation boundary, executed and its result published', async (t) => {
    const { origin, other } = await remoteFixture(t);
    const bare = join(origin, '..', 'engine.git');
    await mkdir(bare);
    await git(bare, ['init', '--bare', '--quiet']);
    const { project, env } = await initializedProject(t, { check: 'process.exit(0);\n', initArgs: ['--auto-sync', '--origin-url', bare] });
    const started = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const branch = (await git(project, ['symbolic-ref', '--short', 'HEAD'])).trim();
    // Local startup does not wait for Git's asynchronous upstream discovery.
    const snapshot = await waitFor(async () => {
        const observed = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
        return observed.sync?.upstream === `origin/${branch}` ? observed : undefined;
    }, { message: 'the synchronization upstream to be discovered' });
    assert.ok(snapshot.sync, 'the synchronization panel exists while autosync is enabled');
    assert.equal(snapshot.sync.upstream, `origin/${branch}`);

    // Another machine adds a task to the shared repository.
    const machine = join(other, '..', 'machine');
    await git(join(other, '..'), ['clone', '-q', '--branch', branch, bare, machine]);
    for (const [key, value] of [['user.name', 'Other'], ['user.email', 'other@example.test'], ['commit.gpgsign', 'false']]) await git(machine, ['config', key, value]);
    await writeFile(join(machine, 'tasks', 'remote-task.book'), 'TASK Remote task from another machine\nGOAL Write the remote output.\nTASK AGENT @Developer\n');
    await git(machine, ['add', '-A']);
    await git(machine, ['commit', '-q', '-m', 'Remote task']);
    // The engine publishes its own results meanwhile: like any clone, integrate before pushing (non-fast-forward).
    await waitFor(async () => {
        await git(machine, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', branch]);
        return await git(machine, ['push', '-q', 'origin', `HEAD:${branch}`]).then(() => true, () => false);
    }, { message: 'the other machine to publish its task', timeoutMs: 60_000, intervalMs: 1000 });

    // A local authoring operation is a boundary: the engine fetches, then integrates after its own commit.
    assert.equal((await ptbk(['add', 'Local task', '--agent', 'Developer', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await subjects(project)).includes('ptbk: Remote task from another machine'), { message: 'the remote task to be executed', timeoutMs: 120_000 });
    const history = await subjects(project);
    assert.ok(history.includes(`ptbk: Merge origin/${branch} into ${branch}`), 'remote work arrived with a visible merge');
    await waitFor(async () => /^`ptbk` `task\.result` - (?:`[^`\n]+` )?Remote task from another machine/m.test(await git(bare, ['log', '--format=%s', branch])), { message: 'the published result', timeoutMs: 120_000 });
    assert.doesNotMatch(await git(project, ['log', '--format=%s']), /rebase/i);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
