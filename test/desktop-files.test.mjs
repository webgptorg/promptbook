import assert from 'node:assert/strict';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { DesktopFiles } from '../dist/engine/desktop-files.js';
import { commitPaths } from '../dist/project/git.js';
import { readCurrentChanges, readHistory } from '../dist/project/history.js';
import { git, initializedProject, initRepository, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * A committed project fixture with ordinary files, entity Books and configuration.
 */
async function projectFixture(t) {
    const root = await temporaryDirectory(t, 'ptbk desktop files');
    const project = join(root, 'project');
    await initRepository(project);
    for (const directory of ['docs', 'agents/.core', 'tasks', 'chats']) await mkdir(join(project, directory), { recursive: true });
    await writeFile(join(project, 'notes.md'), '# Notes\r\nfirst\r\n');
    await writeFile(join(project, 'docs', 'readme.md'), 'docs\n');
    await writeFile(join(project, 'agents', 'writer.book'), 'AGENT Writer\n');
    await writeFile(join(project, 'agents', '.core', 'adam.book'), 'AGENT Adam\n');
    await writeFile(join(project, 'tasks', 'x.book'), 'TASK X\n');
    await writeFile(join(project, 'ptbk.json'), '{}\n');
    await writeFile(join(project, '.gitignore'), '.ptbk/\n');
    await git(project, ['add', '-A']);
    await git(project, ['commit', '-q', '-m', 'Fixture']);
    return { root, project };
}

/**
 * Desktop Files over a fixture with a recording host (real scoped commits, short batch timing).
 */
function desktopFiles(project, overrides = {}) {
    const owned = new Map();
    const reserved = new Set();
    const logs = [];
    const files = new DesktopFiles({
        projectRoot: project,
        stateFile: join(project, '.ptbk', 'state', 'desktop-files.json'),
        temporaryDirectory: join(project, '.ptbk', 'tmp'),
        entityRoots: () => ['agents', 'tasks', 'chats'],
        protectedFiles: () => ['ptbk.json', 'report.book'],
        ownerOf: (absolute) => owned.get(resolve(absolute)),
        commitMode: () => true,
        commit: async (paths, subject, trailers) => {
            const outcome = await commitPaths({ projectRoot: project, repositoryRoot: project, paths, subject, trailers, temporaryDirectory: join(project, '.ptbk', 'tmp') });
            return outcome.committed ? outcome.sha : undefined;
        },
        reserve: (paths, pending) => {
            for (const path of paths) pending ? reserved.add(path) : reserved.delete(path);
        },
        onChange: () => undefined,
        log: (text) => void logs.push(text),
        quietMs: 150,
        maxAgeMs: 600,
        ...overrides,
    });
    return { files, owned, reserved, logs };
}

/**
 * Subjects of the newest commits.
 */
async function log(project, count = 5) {
    return (await git(project, ['log', `-${count}`, '--format=%s'])).trim().split('\n');
}

test('desktop Files: text saves check revisions and ownership, share one batched commit after the quiet period and never commit a changed copy', async (t) => {
    const { project } = await projectFixture(t);
    // The quiet period outlasts the saves on a slow runner, so they all join one pending batch before it commits.
    const { files, owned, reserved } = desktopFiles(project, { quietMs: 2000, maxAgeMs: 10_000 });
    await files.recover();
    t.after(() => files.dispose());

    const source = await files.readText('notes.md');
    assert.equal(source.editable, true);
    assert.equal(source.text, '# Notes\r\nfirst\r\n', 'CRLF is kept exactly');
    assert.equal((await files.readText('agents/.core/adam.book')).editable, false, 'readable core Books grant no write access');
    assert.equal((await files.readText('ptbk.json')).editable, false, 'configuration is readable, not editable here');
    await assert.rejects(files.saveText({ path: 'agents/writer.book', text: 'x', revision: 'r' }), /Book editor/);
    assert.equal((await files.saveText({ path: 'notes.md', text: source.text, revision: source.revision })).status, 'unchanged');
    assert.equal(files.view().batches.length, 0, 'an unchanged save creates no batch');

    const first = await files.saveText({ path: 'notes.md', text: '# Notes\r\nsecond\r\n', revision: source.revision });
    assert.equal(first.status, 'saved');
    assert.equal(first.persistence, 'pending');
    assert.equal(await readFile(join(project, 'notes.md'), 'utf8'), '# Notes\r\nsecond\r\n', 'saved to the file at once');
    const stale = await files.saveText({ path: 'notes.md', text: 'lost?', revision: source.revision });
    assert.equal(stale.status, 'conflict');
    assert.equal(stale.current.text, '# Notes\r\nsecond\r\n', 'the conflict carries the current source for reconciliation');
    const second = await files.saveText({ path: 'notes.md', text: '# Notes\r\nthird\r\n', revision: first.revision });
    assert.equal(second.status, 'saved');
    const [batch] = files.view().batches;
    assert.equal(batch.state, 'pending');
    assert.ok(batch.dueAt);
    assert.ok(reserved.has(join(project, 'notes.md')), 'pending files are engine-authored meanwhile');
    assert.equal(files.pendingOrigin(join(project, 'notes.md')).kind, 'pending-desktop');

    await waitFor(async () => (await log(project, 1))[0] === 'ptbk: Edit notes.md' || undefined, { message: 'the batched commit', timeoutMs: 20_000, intervalMs: 50 });
    assert.equal((await git(project, ['rev-list', '--count', 'HEAD'])).trim(), '2', 'repeated saves of one file share one commit');
    assert.match(await git(project, ['log', '-1', '--format=%B']), /Operation-Source: Promptbook Desktop/);
    assert.equal(files.view().batches.length, 0);
    assert.equal(files.view().recent[0].outcome, 'committed');
    assert.equal(reserved.size, 0);

    // A task owning the file refuses the save; the client keeps its draft.
    const current = await files.readText('notes.md');
    owned.set(join(project, 'notes.md'), 'Developer');
    assert.equal((await files.readText('notes.md')).editable, false);
    assert.match((await files.saveText({ path: 'notes.md', text: 'x', revision: current.revision })).message, /Developer owns/);
    owned.clear();

    // An external edit after acceptance blocks the commit; both versions stay (the current file is not staged as accepted).
    await files.saveText({ path: 'notes.md', text: 'accepted\n', revision: current.revision });
    await writeFile(join(project, 'notes.md'), 'edited elsewhere\n');
    const head = (await git(project, ['rev-parse', 'HEAD'])).trim();
    await files.flush();
    assert.equal((await git(project, ['rev-parse', 'HEAD'])).trim(), head, 'nothing was committed');
    assert.equal(files.view().batches[0].state, 'blocked');
    assert.match(files.view().batches[0].reason, /changed after it was saved/);
    assert.equal(await readFile(join(project, 'notes.md'), 'utf8'), 'edited elsewhere\n');
    await files.dismiss(files.view().batches[0].id);
    assert.equal(files.view().recent[0].outcome, 'dismissed');

    // A save that arrives while its file's batch commits waits for that commit, then starts the next batch: the commit
    // never judges the newer save as an external change.
    const readme = await files.readText('docs/readme.md');
    const before = await files.saveText({ path: 'docs/readme.md', text: 'committing\n', revision: readme.revision });
    const committing = files.flush();
    const during = await files.saveText({ path: 'docs/readme.md', text: 'saved during the commit\n', revision: before.revision });
    assert.equal(during.status, 'saved');
    await committing;
    assert.equal(await git(project, ['show', 'HEAD:docs/readme.md']), 'committing\n', 'the commit holds the version it accepted');
    assert.deepEqual(files.view().batches.map((batch) => batch.state), ['pending'], 'the newer save waits in its own batch, never blocked');
    await files.flush();
    assert.equal(await git(project, ['show', 'HEAD:docs/readme.md']), 'saved during the commit\n');
    assert.deepEqual((await log(project, 2)), ['ptbk: Edit docs/readme.md', 'ptbk: Edit docs/readme.md']);
    assert.equal(files.view().batches.length, 0);
});

test('desktop Files: imports preflight collisions, hidden descendants and escaping links, upload into place and commit as one operation', async (t) => {
    const { root, project } = await projectFixture(t);
    const { files } = desktopFiles(project);
    await files.recover();
    t.after(() => files.dispose());

    const entries = [
        { path: 'pack', type: 'directory' },
        { path: 'pack/a.txt', type: 'file', size: 2 },
        { path: 'pack/.env', type: 'file', size: 4 },
        { path: 'pack/sub', type: 'directory' },
        { path: 'pack/sub/b.md', type: 'file', size: 2 },
        { path: 'readme.md', type: 'file', size: 3 },
    ];
    const review = await files.preflight({ kind: 'import', destination: 'docs', entries, view: 'files-1' });
    assert.equal(review.needsReview, true);
    const pack = review.items.find((item) => item.path === 'pack');
    assert.deepEqual(pack.rejected, ['pack/.env'], 'hidden descendants are never written');
    assert.equal(review.items.find((item) => item.path === 'readme.md').status, 'collision');
    assert.match(review.summary, /Import 3 files and 2 folders into docs; 1 name already exists; 1 item is not written/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'preflight writes nothing');

    const applied = await files.apply({ id: review.id });
    assert.equal(applied.state, 'writing');
    assert.deepEqual(applied.uploads.map((item) => item.target).sort(), ['docs/pack/a.txt', 'docs/pack/sub/b.md', 'docs/readme (2).md'], 'Keep Both is the default');
    await assert.rejects(files.apply({ id: review.id }), /expired or was already applied/);
    const contents = { 'pack/a.txt': 'a\n', 'pack/sub/b.md': 'b\n', 'readme.md': 'new\n' };
    for (const upload of applied.uploads) await files.upload(applied.id, upload.index, Readable.from([Buffer.from(contents[entries[upload.index].path])]));
    assert.equal(files.view().batches[0].state, 'writing', 'an import still writing is never committed');
    const completed = await files.complete(applied.id);
    assert.equal(completed.state, 'completed');
    assert.equal(await readFile(join(project, 'docs', 'readme (2).md'), 'utf8'), 'new\n');
    assert.equal(await readFile(join(project, 'docs', 'readme.md'), 'utf8'), 'docs\n', 'the existing file is kept');

    // A successive collision-free import from the same view joins the batch.
    const more = await files.preflight({ kind: 'import', destination: 'docs', entries: [{ path: 'c.txt', type: 'file', size: 2 }], view: 'files-1' });
    assert.equal(more.needsReview, false, 'an ordinary collision-free import needs no dialog');
    const moreApplied = await files.apply({ id: more.id });
    await files.upload(moreApplied.id, 0, Readable.from([Buffer.from('c\n')]));
    await files.complete(moreApplied.id);
    assert.equal(files.view().batches.length, 1);
    await files.flush(files.view().batches[0].id);
    assert.deepEqual(await log(project, 1), ['ptbk: Import 4 files into docs']);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');

    // Skip and Replace.
    const again = await files.preflight({ kind: 'import', destination: 'docs', entries: [{ path: 'c.txt', type: 'file' }, { path: 'readme.md', type: 'file' }], view: 'files-2' });
    const resolved = await files.apply({ id: again.id, choices: { 'c.txt': 'skip', 'readme.md': 'replace' } });
    assert.deepEqual(resolved.skipped, ['c.txt']);
    assert.deepEqual(resolved.uploads.map((item) => item.target), ['docs/readme.md']);
    await files.upload(resolved.id, resolved.uploads[0].index, Readable.from([Buffer.from('replaced\n')]));
    await files.complete(resolved.id);
    assert.equal(await readFile(join(project, 'docs', 'readme.md'), 'utf8'), 'replaced\n');

    // Protected targets and escaping junctions are refused before anything is written.
    const outside = join(root, 'outside');
    await mkdir(outside);
    await symlink(outside, join(project, 'docs', 'out'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(files.preflight({ kind: 'import', destination: 'docs/out', entries: [{ path: 'x.txt', type: 'file' }] }), /outside the project|is a link/);
    await assert.rejects(files.preflight({ kind: 'import', destination: 'docs/out/inner', entries: [{ path: 'x.txt', type: 'file' }] }), /outside the project/);
    await assert.rejects(files.preflight({ kind: 'import', destination: '.git', entries: [{ path: 'x.txt', type: 'file' }] }), /protected/);
    const configuration = await files.preflight({ kind: 'import', destination: '', entries: [{ path: 'ptbk.json', type: 'file' }] });
    assert.match(configuration.items[0].status, /collision|rejected/);
    const replaceConfiguration = await files.apply({ id: configuration.id, choice: 'replace' });
    assert.equal(replaceConfiguration.uploads, undefined);
    assert.match(replaceConfiguration.conflicting[0].reason, /protected/);
    assert.equal(await readFile(join(project, 'ptbk.json'), 'utf8'), '{}\n');
});

test('desktop Files: copies within the project and confirmed deletions with protected scopes; an interrupted import waits for review', async (t) => {
    const { project } = await projectFixture(t);
    // Batches here commit only when the test says so (a slow machine must not commit a batch mid-scenario).
    let session = desktopFiles(project, { quietMs: 60_000, maxAgeMs: 120_000 });
    await session.files.recover();
    t.after(() => session.files.dispose());
    const { files } = session;

    await mkdir(join(project, 'docs', 'guide'), { recursive: true });
    await writeFile(join(project, 'docs', 'guide', 'one.md'), 'one\n');
    await writeFile(join(project, 'docs', 'guide', '.hidden'), 'h\n');
    await git(project, ['add', '-A']);
    await git(project, ['commit', '-q', '-m', 'Guide']);
    const copy = await files.preflight({ kind: 'copy', destination: 'docs', entries: [{ path: 'docs/guide' }], view: 'v' });
    assert.equal(copy.items[0].status, 'collision');
    const copied = await files.apply({ id: copy.id });
    assert.equal(copied.state, 'completed');
    assert.equal(await readFile(join(project, 'docs', 'guide (2)', 'one.md'), 'utf8'), 'one\n');
    await assert.rejects(readFile(join(project, 'docs', 'guide (2)', '.hidden')), /ENOENT/, 'hidden descendants are not copied');
    await files.flush();
    assert.deepEqual(await log(project, 1), ['ptbk: Copy 1 file into docs']);

    await mkdir(join(project, 'docs', 'secret'));
    await writeFile(join(project, 'docs', 'secret', '.env'), 'TOKEN=x\n');
    const deletion = await files.preflight({ kind: 'delete', entries: [{ path: 'docs/guide (2)' }, { path: 'docs/guide (2)/one.md' }, { path: 'tasks/x.book' }, { path: 'agents' }, { path: 'docs/secret' }, { path: 'ptbk.json' }, { path: '.git' }] });
    assert.equal(deletion.needsReview, true, 'a deletion is always confirmed with its scope');
    const status = Object.fromEntries(deletion.items.map((item) => [item.path, item.status]));
    assert.deepEqual(status, { 'docs/guide (2)': 'ok', 'tasks/x.book': 'rejected', agents: 'rejected', 'docs/secret': 'rejected', 'ptbk.json': 'rejected', '.git': 'rejected' });
    assert.match(deletion.items.find((item) => item.path === 'tasks/x.book').reason, /Tasks/);
    assert.match(deletion.items.find((item) => item.path === 'docs/secret').reason, /protected content/);
    await assert.rejects(files.apply({ id: deletion.id }), /Confirm the deletion/);
    const deleted = await files.apply({ id: deletion.id, confirm: true });
    assert.deepEqual(deleted.accepted, ['docs/guide (2)']);
    assert.deepEqual(await log(project, 1), ['ptbk: Delete docs/guide (2)'], 'a deletion is its own commit at once');
    assert.equal(await readFile(join(project, 'tasks', 'x.book'), 'utf8'), 'TASK X\n');
    assert.equal(await readFile(join(project, 'docs', 'secret', '.env'), 'utf8'), 'TOKEN=x\n');

    // Deleting a file whose import is still pending supersedes it: nothing stays blocked.
    const pendingImport = await files.preflight({ kind: 'import', destination: 'docs', entries: [{ path: 'gone.txt', type: 'file' }, { path: 'kept.txt', type: 'file' }], view: 'w' });
    const pendingApplied = await files.apply({ id: pendingImport.id });
    for (const upload of pendingApplied.uploads) await files.upload(pendingApplied.id, upload.index, Readable.from([Buffer.from(`${upload.target}\n`)]));
    await files.complete(pendingApplied.id);
    const removal = await files.preflight({ kind: 'delete', entries: [{ path: 'docs/gone.txt' }] });
    await files.apply({ id: removal.id, confirm: true });
    assert.deepEqual(files.view().batches.map((item) => item.paths), [['docs/kept.txt']]);
    await files.flush();
    assert.deepEqual(await log(project, 1), ['ptbk: Import 1 file into docs']);
    assert.equal(files.view().batches.length, 0);

    // A deletion while that import's commit is in flight waits for it, then removes the committed file in its own commit.
    const racing = await files.preflight({ kind: 'import', destination: 'docs', entries: [{ path: 'raced.txt', type: 'file' }, { path: 'stays.txt', type: 'file' }], view: 'w' });
    const racingApplied = await files.apply({ id: racing.id });
    for (const upload of racingApplied.uploads) await files.upload(racingApplied.id, upload.index, Readable.from([Buffer.from(`${upload.target}\n`)]));
    await files.complete(racingApplied.id);
    const racedRemoval = await files.preflight({ kind: 'delete', entries: [{ path: 'docs/raced.txt' }] });
    // The deletion is applied while that flush is in flight (its commit takes the batch under the operation lock).
    const committing = files.flush();
    assert.ok(['pending', 'committing'].includes(files.view().batches.find((item) => item.paths.includes('docs/raced.txt'))?.state));
    await files.apply({ id: racedRemoval.id, confirm: true });
    await committing;
    assert.deepEqual(await log(project, 2), ['ptbk: Delete docs/raced.txt', 'ptbk: Import 2 files into docs']);
    assert.equal(files.view().batches.length, 0, 'nothing is left blocked');
    await assert.rejects(readFile(join(project, 'docs', 'raced.txt')), /ENOENT/);
    assert.equal(await readFile(join(project, 'docs', 'stays.txt'), 'utf8'), 'docs/stays.txt\n');

    // An import interrupted by a restart: applied items are identified, the batch waits for review, nothing is replayed.
    const review = await files.preflight({ kind: 'import', destination: 'docs', entries: [{ path: 'p.txt', type: 'file' }, { path: 'q.txt', type: 'file' }], view: 'v' });
    const applied = await files.apply({ id: review.id });
    await files.upload(applied.id, 0, Readable.from([Buffer.from('p\n')]));
    files.dispose();
    session = desktopFiles(project);
    await session.files.recover();
    const [batch] = session.files.view().batches;
    assert.equal(batch.state, 'review');
    assert.match(batch.reason, /Interrupted: 1 file was not written \(docs\/q\.txt\)/);
    assert.deepEqual(batch.paths, ['docs/p.txt']);
    const before = (await git(project, ['rev-parse', 'HEAD'])).trim();
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.equal((await git(project, ['rev-parse', 'HEAD'])).trim(), before, 'an interrupted operation is not committed automatically');
    await session.files.flush(batch.id);
    assert.deepEqual(await log(project, 1), ['ptbk: Import 1 file into docs']);
    assert.deepEqual((await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n'), ['docs/p.txt']);
});

test('History: desktop current changes distinguish staged, unstaged, untracked and conflicted paths; branch scope covers upstream, absent upstream, detached HEAD and added branches', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk history scope');
    const origin = join(root, 'origin.git');
    await mkdir(origin);
    await git(origin, ['init', '--bare', '--quiet', '--initial-branch=main']);
    const project = join(root, 'project');
    await initRepository(project);
    await git(project, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    for (const name of ['a.md', 'b.md', 'c.md', 'd.md', 'm.md']) await writeFile(join(project, name), `${name}\n`);
    await git(project, ['add', '-A']);
    await git(project, ['commit', '-q', '-m', 'Base']);
    await git(project, ['remote', 'add', 'origin', origin]);
    await git(project, ['push', '-q', '-u', 'origin', 'main']);

    // Conflict on m.md.
    await git(project, ['checkout', '-q', '-b', 'side']);
    await writeFile(join(project, 'm.md'), 'side\n');
    await git(project, ['commit', '-q', '-am', 'Side change']);
    await git(project, ['checkout', '-q', 'main']);
    await writeFile(join(project, 'm.md'), 'main\n');
    await git(project, ['commit', '-q', '-am', 'Main change']);
    await git(project, ['merge', 'side']).catch(() => undefined);
    await writeFile(join(project, 'a.md'), 'staged\n');
    await git(project, ['add', 'a.md']);
    await writeFile(join(project, 'b.md'), 'unstaged\n');
    await git(project, ['rm', '-q', 'c.md']);
    await writeFile(join(project, 'new.md'), 'untracked\n');
    await writeFile(join(project, '.env'), 'SECRET=1\n');
    const before = (await git(project, ['status', '--porcelain'])).trim();

    const view = await readCurrentChanges(project, (absolute) => (absolute === join(project, 'b.md') ? { kind: 'task', label: 'Developer' } : undefined));
    const byPath = Object.fromEntries(view.changes.map((change) => [change.path, change]));
    assert.equal(view.changes[0].path, 'm.md', 'conflicts come first');
    assert.equal(byPath['m.md'].conflicted, true);
    assert.equal(byPath['a.md'].staged, 'modified');
    assert.equal(byPath['a.md'].unstaged, undefined);
    assert.equal(byPath['b.md'].unstaged, 'modified');
    assert.deepEqual(byPath['b.md'].origin, { kind: 'task', label: 'Developer' }, 'only verified origins are annotated');
    assert.equal(byPath['c.md'].staged, 'deleted');
    assert.equal(byPath['new.md'].untracked, true);
    assert.equal(byPath['.env'], undefined, 'protected paths are only counted');
    assert.equal(view.protected, 1);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), before, 'reading changes nothing');
    await git(project, ['merge', '--abort']);
    await git(project, ['reset', '-q', '--hard']);

    // Branch scope: current branch plus upstream (from local refs only).
    await writeFile(join(project, 'local.md'), 'local\n');
    await git(project, ['add', 'local.md']);
    await git(project, ['commit', '-q', '-m', 'Local only']);
    const scoped = await readHistory(project, { upstream: true });
    assert.deepEqual(scoped.upstream, { name: 'origin/main', state: 'shown' });
    assert.ok(scoped.available.includes('side'));
    assert.ok(scoped.rows.some((row) => row.commit?.refs.includes('origin/main')));
    assert.equal((await readHistory(project)).upstream, undefined, 'the terminal default stays the current branch only');
    const added = await readHistory(project, { upstream: true, branches: ['side', 'not-a-branch', '--output=/tmp/x'] });
    assert.deepEqual(added.included, ['side'], 'only locally known branches are added');
    assert.ok(added.rows.some((row) => row.commit?.subject === 'Side change'));

    // A configured upstream that is gone locally, then no upstream, then a detached HEAD.
    await git(project, ['update-ref', '-d', 'refs/remotes/origin/main']);
    assert.equal((await readHistory(project, { upstream: true })).upstream.state, 'missing');
    await git(project, ['branch', '-q', '--unset-upstream']);
    assert.deepEqual((await readHistory(project, { upstream: true })).upstream, { state: 'none' });
    await git(project, ['checkout', '-q', '--detach']);
    const detached = await readHistory(project, { upstream: true });
    assert.equal(detached.detached, true);
    assert.equal(detached.branch, undefined);
    assert.deepEqual(detached.upstream, { state: 'detached' });
    assert.ok(detached.rows.length > 0);
});

test('engine: desktop text saves and their commits continue during Pause; History shows the pending desktop origin; no remote work', async (t) => {
    const { project, env } = await initializedProject(t);
    const engineEnv = { ...env, PTBK_DESKTOP_FILES_QUIET_MS: '3000', PTBK_DESKTOP_FILES_MAX_AGE_MS: '10000' };
    await writeFile(join(project, 'notes.md'), 'first\n');
    await git(project, ['add', 'notes.md']);
    await git(project, ['commit', '-q', '-m', 'Notes']);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env: engineEnv })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env: engineEnv })).code, 0);
    const { token, http } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const api = async (path, body) => {
        const response = await fetch(`${http.url}${path}`, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
        return { status: response.status, body: await response.json() };
    };
    await waitFor(async () => (await api('api/state')).body.service.state === 'pause' || undefined, { message: 'the engine to pause' });

    const source = await api(`api/files/text?path=notes.md`);
    assert.equal(source.status, 200, JSON.stringify(source.body));
    const saved = await api('api/files/text', { path: 'notes.md', text: 'saved while paused\n', revision: source.body.revision });
    assert.equal(saved.body.status, 'saved', JSON.stringify(saved.body));
    const changes = await api('api/history/changes');
    assert.equal(changes.body.changes.find((change) => change.path === 'notes.md').origin.kind, 'pending-desktop');
    assert.equal((await api('api/state')).body.files.batches[0].state, 'pending');
    const stale = await api('api/files/text', { path: 'notes.md', text: 'stale\n', revision: source.body.revision });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.status, 'conflict');
    await waitFor(async () => (await git(project, ['log', '-1', '--format=%s'])).trim() === 'ptbk: Edit notes.md' || undefined, { message: 'the commit during Pause', timeoutMs: 15_000 });
    assert.equal((await api('api/state')).body.service.state, 'pause', 'the engine is still paused');

    // Commit now and History's branch scope through the same API.
    const second = await api('api/files/text', { path: 'notes.md', text: 'committed now\n', revision: saved.body.revision });
    assert.equal(second.body.status, 'saved');
    const now = await api('api/files/commit', {});
    assert.equal(now.body.commits.length, 1);
    const history = await api('api/history?upstream=1&branch=missing');
    assert.deepEqual(history.body.upstream, { state: 'none' });
    assert.deepEqual(history.body.included, []);
});
