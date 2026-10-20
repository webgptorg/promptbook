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
        for (const [key, value] of [['user.name', 'Fixture Tester'], ['user.email', 'fixture@example.test'], ['commit.gpgsign', 'false']]) await git(path, ['config', key, value]);
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

test('synchronization coordinator: visible merges, publication, no empty merges, deferred pre-commit integration, conflicts to Fixer, backoff', async (t) => {
    const { local, other, origin } = await remoteFixture(t);
    const { sync, events, disable } = coordinator(local);
    await sync.begin();
    t.after(() => sync.end());

    assert.equal((await sync.request('manual')).outcome, 'synchronized', 'nothing to do');
    const head = (await git(local, ['rev-parse', 'HEAD'])).trim();

    await change(other, 'remote.md', 'from another machine\n', 'Remote work');
    const fetchOnly = await sync.request('pre-commit');
    assert.equal(fetchOnly.outcome, 'deferred', 'a pre-commit attempt only fetches');
    assert.equal((await git(local, ['rev-parse', 'HEAD'])).trim(), head, 'nothing was integrated before the local commit');
    const merged = await sync.request('boundary');
    assert.equal(merged.outcome, 'synchronized', merged.message);
    assert.equal(events.integrated, 1);
    const parents = (await git(local, ['log', '-1', '--format=%P'])).trim().split(' ');
    assert.equal(parents.length, 2, 'a visible merge commit even though fast-forward was possible');
    assert.equal((await git(local, ['log', '-1', '--format=%s'])).trim(), 'PTBK: Merge origin/main into main');
    assert.equal((await readFile(join(local, 'remote.md'), 'utf8')), 'from another machine\n');
    assert.equal((await git(origin, ['rev-parse', 'main'])).trim(), (await git(local, ['rev-parse', 'HEAD'])).trim(), 'the merge was published');

    const before = (await git(local, ['rev-list', '--count', 'HEAD'])).trim();
    assert.equal((await sync.request('timer')).outcome, 'synchronized');
    assert.equal((await git(local, ['rev-list', '--count', 'HEAD'])).trim(), before, 'up-to-date input creates no empty merge');

    await change(local, 'local.md', 'local result\n', 'PTBK: Local result', false);
    assert.equal((await sync.request('post-commit')).outcome, 'synchronized');
    assert.equal((await git(origin, ['log', '-1', '--format=%s', 'main'])).trim(), 'PTBK: Local result', 'completed local work is published');

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
    assert.equal((await git(project, ['remote', 'get-url', 'origin'])).trim(), bare);
    assert.equal((await git(project, ['rev-parse', '--abbrev-ref', '@{u}'])).trim(), 'origin/main');
    assert.equal((await git(bare, ['log', '-1', '--format=%s', 'main'])).trim(), 'PTBK: Initialize project', 'the committed local setup was published');
    assert.match(init.stdout, /Published main to origin/);

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
    const started = await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const snapshot = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.ok(snapshot.sync, 'the synchronization panel exists while autosync is enabled');
    assert.equal(snapshot.sync.upstream, 'origin/main');

    // Another machine adds a task to the shared repository.
    const machine = join(other, '..', 'machine');
    await git(join(other, '..'), ['clone', '-q', bare, machine]);
    for (const [key, value] of [['user.name', 'Other'], ['user.email', 'other@example.test'], ['commit.gpgsign', 'false']]) await git(machine, ['config', key, value]);
    await writeFile(join(machine, 'tasks', 'remote-task.book'), 'TASK Remote task from another machine\nGOAL Write the remote output.\nTASK AGENT @Developer\n');
    await git(machine, ['add', '-A']);
    await git(machine, ['commit', '-q', '-m', 'Remote task']);
    // The engine publishes its own results meanwhile: like any clone, integrate before pushing (non-fast-forward).
    await waitFor(async () => {
        await git(machine, ['pull', '-q', '--no-rebase', '--no-edit', 'origin', 'main']);
        return await git(machine, ['push', '-q', 'origin', 'HEAD:main']).then(() => true, () => false);
    }, { message: 'the other machine to publish its task', timeoutMs: 60_000, intervalMs: 1000 });

    // A local authoring operation is a boundary: the engine fetches, then integrates after its own commit.
    assert.equal((await ptbk(['add', 'Local task', '--agent', 'Developer', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await subjects(project)).includes('PTBK: Remote task from another machine'), { message: 'the remote task to be executed', timeoutMs: 120_000 });
    const history = await subjects(project);
    assert.ok(history.some((subject) => /^PTBK: Merge origin\/main into main/.test(subject)), 'remote work arrived with a visible merge');
    await waitFor(async () => (await git(bare, ['log', '--format=%s', 'main'])).includes('PTBK: Remote task from another machine'), { message: 'the published result', timeoutMs: 120_000 });
    assert.doesNotMatch(await git(project, ['log', '--format=%s']), /rebase/i);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
