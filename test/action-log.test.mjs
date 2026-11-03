import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ActionLog, parseActionRecord, renderActionRecord, saveEngineAction } from '../dist/engine/action-log.js';
import { projectAt } from '../dist/project/workspace.js';
import { actionDirectoryOf, traceDirectoryOf } from '../dist/tasks/identity.js';
import { drive, findGenerated, git, initializedProject, messages, ptbk, rawSubjects, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Fails the check while any output contains BROKEN.
 */
const CHECK = `import { existsSync, readdirSync, readFileSync } from 'node:fs';
if (existsSync('output')) for (const file of readdirSync('output')) if (readFileSync('output/' + file, 'utf8').includes('BROKEN')) { console.error('broken output: ' + file); process.exit(1); }
`;

/**
 * Adds a task for Developer and returns its project-relative source path.
 */
async function addTask(project, env, title) {
    const added = await ptbk(['add', title, '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal(added.code, 0, added.output);
    return (await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n').find((file) => file.startsWith('tasks/') && file.endsWith('.book'));
}

test('action records: the Markdown record round-trips its readable metadata', () => {
    const intent = {
        version: 1,
        id: 'act-abc123',
        subject: { taskName: 'Weekly newsletter', source: 'tasks/2026-10-29-newsletter.book', agent: '@Developer', attempt: 'r1-a1', trace: 'traces/2026-10-29-newsletter' },
        operation: 'Send email',
        service: 'Gmail',
        target: 'reader@example.test',
        content: 'Hello',
        startedAt: '2026-10-29T10:00:00+01:00',
        outcome: 'confirmed',
        impact: 2.5,
        impactReason: 'A newsletter to a small audience.',
        reference: '<msg-1>',
        history: ['2026-10-29T10:00:00+01:00 — intent recorded before the request (attempt r1-a1)', '2026-10-29T10:00:05+01:00 — confirmed (attempt r1-a1)'],
        closed: true,
        record: 'actions/2026-10-29-newsletter/x.md',
    };
    const summary = parseActionRecord('actions/2026-10-29-newsletter/x.md', renderActionRecord(intent, 'a'.repeat(40)));
    assert.deepEqual(
        { operation: summary.operation, service: summary.service, outcome: summary.outcome, agent: summary.agent, taskName: summary.taskName, source: summary.source, id: summary.id, at: summary.at, reference: summary.reference, task: summary.task },
        { operation: 'Send email', service: 'Gmail', outcome: 'success', agent: '@Developer', taskName: 'Weekly newsletter', source: 'tasks/2026-10-29-newsletter.book', id: 'act-abc123', at: '2026-10-29T10:00:00+01:00', reference: '<msg-1>', task: '2026-10-29-newsletter' },
    );
    assert.equal(actionDirectoryOf('tasks/2026-10-29 Newsletter.book'), 'actions/2026-10-29 Newsletter', 'the same literal basename as traces');
    assert.equal(actionDirectoryOf('tasks/2026-10-29 Newsletter.book').slice('actions/'.length), traceDirectoryOf('tasks/2026-10-29 Newsletter.book').slice('traces/'.length));
});

test('action records: an effect whose record was removed (e.g. by a Git revert) stays in the next attempt’s context and its evidence is not pruned', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk actions');
    const log = new ActionLog({ project: projectAt(directory), env: {}, timeZone: () => 'UTC', persist: async () => 'uncommitted', onChange: () => undefined, log: () => undefined });
    const subject = { taskName: 'Send the newsletter', source: 'tasks/2026-10-30-0900-send-the-newsletter.book', agent: '@Developer', attempt: '1', trace: 'traces/2026-10-30-0900-send-the-newsletter/' };
    const saved = await log.record(subject, { operation: 'Send email', service: 'Gmail', target: 'team@example.com', outcome: 'success', observed: 'Sent.' });
    const path = /^Saved (\S+) /.exec(saved.text)[1];
    const id = /, id (act-[a-z0-9]+)/.exec(await log.taskContext(subject.source))[1];
    await rm(join(directory, path));
    const context = await log.taskContext(subject.source);
    assert.match(context, new RegExp(`^- success: Send email on Gmail → team@example\\.com \\(.*, id ${id}\\) — its record \`${path}\` was removed from the project`, 'm'), 'the effect is still known, so it is reconciled instead of repeated');
    await log.prune(0);
    assert.match(await log.taskContext(subject.source), /was removed from the project/, 'the only remaining evidence is not pruned');
    // Reconciling it by its id restores the same record (no duplicate).
    await log.record({ ...subject, attempt: '2' }, { id, outcome: 'success', observed: 'The sent message is in the mailbox.' });
    assert.deepEqual(await readdir(join(directory, 'actions', '2026-10-30-0900-send-the-newsletter')), [path.split('/').pop()]);
    assert.doesNotMatch(await log.taskContext(subject.source), /was removed/);
});

test('action records: reading a record offers only verified links (existing task Book and evidence, a plain http(s) receipt)', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk action links');
    const log = new ActionLog({ project: projectAt(directory), env: {}, timeZone: () => 'UTC', persist: async () => 'uncommitted', onChange: () => undefined, log: () => undefined });
    await mkdir(join(directory, 'tasks'), { recursive: true });
    await mkdir(join(directory, 'traces', '2026-10-30-0900-post-news'), { recursive: true });
    await writeFile(join(directory, 'tasks', '2026-10-30-0900-post-news.book'), 'TASK Post news\n');
    const subject = (source, trace) => ({ taskName: 'Post news', source, agent: '@Developer', attempt: '1', trace });
    const path = async (result) => /^Saved (\S+) /.exec(result.text)[1];
    const linked = await path(await log.record(subject('tasks/2026-10-30-0900-post-news.book', 'traces/2026-10-30-0900-post-news/'), { operation: 'Publish post', service: 'LinkedIn', outcome: 'success', reference: 'https://www.linkedin.test/posts/42' }));
    assert.deepEqual((await log.read(linked)).links, { task: 'tasks/2026-10-30-0900-post-news.book', evidence: 'traces/2026-10-30-0900-post-news', receipt: 'https://www.linkedin.test/posts/42' });
    for (const reference of ['javascript:alert(1)', 'https://user:secret@example.test/receipt', 'Submission 2026/118']) {
        const unverified = await path(await log.record(subject('tasks/2026-10-30-0900-gone.book', '.ptbk/hidden/'), { operation: 'Submit form', service: 'Example', outcome: 'confirmed', reference }));
        assert.deepEqual((await log.read(unverified)).links, {}, `no task, hidden evidence and no safe receipt for ${reference}`);
    }
});

test('action records: one committed Markdown per remote mutation, independent of ignored traces and a failed check; reconciled without duplicates', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    // Traces stay out of Git by default (traces.isCommitted false): action records are versioned anyway.
    assert.equal(JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8')).traces?.isCommitted ?? false, false);
    const source = await addTask(project, env, 'Send the weekly news EXTERNAL_ACTIONS');
    const quiet = await addTask(project, env, 'Write the local notes');
    const run = await drive(project, env, async () => findGenerated(await subjects(project), 'Send the weekly news EXTERNAL_ACTIONS', 'ptbk: ') && findGenerated(await subjects(project), 'Write the local notes', 'ptbk: '), { message: 'both results', timeoutMs: 120_000 });
    assert.equal(run.code, 0, run.output);
    assert.match(run.stdout, /Check failed/, 'the first attempt failed its check after the actions');

    const directory = join(project, actionDirectoryOf(source));
    const files = (await readdir(directory)).sort();
    assert.equal(files.length, 3, `one record per logical action: ${files.join(', ')}`);
    const records = await Promise.all(files.map(async (file) => ({ file, content: await readFile(join(directory, file), 'utf8') })));
    const byOperation = Object.fromEntries(records.map((record) => [parseActionRecord(`${actionDirectoryOf(source)}/${record.file}`, record.content).operation, record]));
    assert.deepEqual(Object.keys(byOperation).sort(), ['Delete record', 'Publish post', 'Send email']);
    assert.match(byOperation['Send email'].content, /^- \*\*Outcome:\*\* success$/m);
    assert.match(byOperation['Send email'].content, /token=\[REDACTED\]/, 'secret URL parameters are redacted before storage');
    assert.doesNotMatch(byOperation['Send email'].content, /SECRETTOKEN/);
    assert.match(byOperation['Publish post'].content, /^- \*\*Outcome:\*\* success$/m, 'the uncertain post was reconciled in place');
    assert.match(byOperation['Publish post'].content, /uncertain: The request timed out/, 'its history keeps the earlier uncertainty');
    assert.match(byOperation['Delete record'].content, /^- \*\*Outcome:\*\* uncertain$/m, 'an intent without an outcome is preserved as uncertain, never assumed');

    assert.equal((await git(project, ['status', '--porcelain', '--', 'actions'])).trim(), '', 'every record is committed');
    assert.deepEqual((await git(project, ['ls-files', 'actions'])).trim().split('\n').sort(), files.map((file) => `${actionDirectoryOf(source)}/${file}`).sort());
    assert.equal((await git(project, ['ls-files', 'traces'])).trim(), '', 'traces stay ignored');
    const audit = (await messages(project)).filter((message) => /Action - Send email · Gmail/.test(message.split('\n')[0]));
    assert.equal(audit.length, 1, 'one scoped audit commit of the email');
    assert.match(audit[0], /^ptbk: Action - Send email · Gmail/);
    assert.ok((await rawSubjects(project)).some((subject) => /^ptbk: `[^`]+` Action - Send email · Gmail$/.test(subject)), 'the subject quotes the acting agent’s visual');
    assert.match(audit[0], /^Task-Name: Send the weekly news EXTERNAL_ACTIONS/m);
    await assert.rejects(readdir(join(project, actionDirectoryOf(quiet))), 'a task without external actions has no action directory');
    const touching = (await git(project, ['log', '--format=%s', '--', 'actions'])).trim().split('\n');
    assert.ok(touching.every((subject) => / Action - /.test(subject)), `only scoped action audits touch actions/: ${touching.join(' | ')}`);
});

test('external activity: a bulk operation shares one commit, and the task result commit holds only the task’s own work', async (t) => {
    const { project, env } = await initializedProject(t);
    const source = await addTask(project, env, 'Run the campaign EXTERNAL_BATCH');
    const run = await drive(project, env, async () => findGenerated(await subjects(project), 'Run the campaign EXTERNAL_BATCH', 'ptbk: ') && (await messages(project)).some((message) => / Action - Send email · Gmail \(3 records\)/.test(message.split('\n')[0])), { message: 'the result and the shared commit', timeoutMs: 60_000 });
    assert.equal(run.code, 0, run.output);
    assert.equal((await readdir(join(project, actionDirectoryOf(source)))).length, 3, 'one record per member');
    assert.equal((await git(project, ['status', '--porcelain', '--', 'actions'])).trim(), '');
    const audits = (await git(project, ['log', '--format=%H %s', '--', 'actions'])).trim().split('\n');
    assert.equal(audits.length, 1, `one scoped commit for the whole operation: ${audits.join(' | ')}`);
    assert.match(audits[0], / Action - Send email · Gmail \(3 records\)$/);
    assert.equal((await git(project, ['show', '--name-only', '--format=', audits[0].split(' ')[0]])).trim().split('\n').length, 3);
});

test('external activity: the API shares the views, stays read-only, and a batch opens into its separate records', async (t) => {
    const { project, env } = await initializedProject(t);
    const started = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const { http } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const { csrf } = await (await fetch(`${http.url}api/session`, { headers: { 'X-PTBK-Client': 'dashboard' } })).json();
    const get = async (path) => {
        const response = await fetch(`${http.url}${path}`, { headers: { 'X-PTBK-CSRF': csrf } });
        return { status: response.status, data: await response.json() };
    };
    assert.equal((await fetch(`${http.url}api/actions/view`)).status, 401, 'inspection needs a session');
    await addTask(project, env, 'Run the campaign EXTERNAL_BATCH');
    await waitFor(async () => (await messages(project)).some((message) => / Action - Send email · Gmail \(3 records\)/.test(message.split('\n')[0])), { timeoutMs: 90_000, message: 'the shared commit of the campaign' });
    // The action batch can commit before its task or Chatter finishes. Settle those writers before proving that
    // inspection itself is read-only; otherwise an unrelated background commit races the HEAD assertion.
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await get('api/state')).data.service.state === 'pause', { timeoutMs: 30_000, message: 'the action inspection fixture to pause' });

    const before = await git(project, ['rev-parse', 'HEAD']);
    const top = (await get('api/actions/view')).data;
    assert.equal(top.grouping, 'default');
    assert.equal(top.sort, 'smart');
    assert.equal(top.cutoff, 1);
    assert.equal(top.rows.length, 1);
    const [batch] = top.rows;
    assert.deepEqual({ kind: batch.kind, batch: batch.batch, count: batch.totals.count, outcomes: batch.totals.outcomes }, { kind: 'batch', batch: 'fixture-campaign', count: 3, outcomes: { failed: 1, success: 2 } });
    assert.equal(batch.totals.impact.toFixed(6), (1 + Math.log10(3)).toFixed(6));
    assert.equal(batch.totals.display, '1.48');

    const members = (await get('api/actions/view?batch=fixture-campaign')).data;
    assert.equal(members.rows.length, 3);
    assert.ok(members.rows.every((row) => row.kind === 'action'));
    assert.equal((await get('api/actions/view?grouping=ungrouped')).data.rows.length, 3);
    assert.equal((await get('api/actions/view?grouping=task')).data.rows[0].kind, 'task');
    const agents = (await get('api/actions/view?grouping=agent')).data;
    assert.equal(agents.rows[0].kind, 'agent');
    assert.equal((await get(`api/actions/view?grouping=agent&agent=${agents.rows[0].agent}`)).data.rows[0].kind, 'task');
    const failed = (await get('api/actions/view?outcome=failed')).data;
    assert.deepEqual([failed.rows[0].totals.count, failed.rows[0].totals.unfiltered, failed.rows[0].totals.filtered], [1, 3, true]);
    assert.equal((await get('api/actions/view?grouping=bogus')).data.grouping, 'default', 'an unknown choice falls back to its default');

    const path = members.rows.find((row) => row.action.outcome === 'failed').action.path;
    const record = await get(`api/actions/record?path=${encodeURIComponent(path)}`);
    assert.equal(record.status, 200);
    assert.equal(record.data.impactReason, 'One newsletter reader.');
    assert.ok(record.data.links.task);
    assert.match(record.data.content, /^- \*\*Group:\*\* fixture-campaign$/m);

    assert.equal(await git(project, ['rev-parse', 'HEAD']), before, 'inspection creates no commit');
    assert.equal((await git(project, ['status', '--porcelain', '--', 'actions'])).trim(), '');
    const snapshot = (await get('api/state')).data;
    assert.equal(snapshot.actions.total, 3);
    assert.equal(typeof snapshot.actions.revision, 'number');
    assert.equal((await ptbk(['stop', '--force', '--raw'], { cwd: project, env })).code, 0);
});

test('action records: an engine-owned operation records its effect under actions/.engine/ without an invented task', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk engine action');
    const path = await saveEngineAction({ root: directory }, { system: 'Initialization', operation: 'Create repository', service: 'GitHub', account: 'owner', target: 'github.com/owner/project', content: 'Created the private repository.', observed: '`gh repo create` succeeded.', reference: 'https://github.com/owner/project', timeZone: 'UTC' });
    assert.match(path, /^actions\/\.engine\/initialization\/\d{4}-\d{2}-\d{2}-\d{4}-create-repository-github\.md$/);
    const content = await readFile(join(directory, path), 'utf8');
    assert.match(content, /^- \*\*System operation:\*\* Initialization$/m);
    assert.doesNotMatch(content, /\*\*(Task|Task source|Evidence|Agent):\*\*/, 'no invented task, source, evidence or agent');
    const summary = parseActionRecord(path, content);
    assert.deepEqual({ system: summary.system, taskName: summary.taskName, source: summary.source, outcome: summary.outcome, reference: summary.reference }, { system: 'Initialization', taskName: undefined, source: undefined, outcome: 'success', reference: 'https://github.com/owner/project' });
});

/**
 * A log over a plain directory; `persisted` receives every commit request.
 */
function plainLog(directory, options = {}) {
    const persisted = [];
    const reserved = [];
    const log = new ActionLog({
        project: projectAt(directory),
        env: {},
        timeZone: () => 'UTC',
        persist: async (record) => {
            if (options.failing?.()) throw new Error('commit refused');
            persisted.push(record);
            return 'committed';
        },
        onChange: () => undefined,
        log: () => undefined,
        reserve: (paths) => reserved.push(...paths),
        retryMs: 10,
        groupCommitMs: options.groupCommitMs ?? 60_000,
        ...(options.sessionKnown ? { sessionKnown: options.sessionKnown } : {}),
    });
    return { log, persisted, reserved };
}

/**
 * The subject of one attempt of a task.
 */
const subjectOf = (attempt = '1', extra = {}) => ({ taskName: 'Pay the invoice', source: 'tasks/2026-11-01-0900-pay.book', agent: '@Developer', attempt, trace: 'traces/2026-11-01-0900-pay', ...extra });

test('external activity: a rejected payment is one failed record whose retries stay one logical action', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk failed payment');
    const { log } = plainLog(directory);
    const begun = await log.begin(subjectOf(), { operation: 'Attempt payment', service: 'Bank', target: 'Invoice 42', impact: 4, impact_reason: 'A large one-off transfer.' });
    const id = /intent (act-[a-z0-9]+)/.exec(begun.text)[1];
    const failed = await log.record(subjectOf(), { id, outcome: 'failed', observed: 'Card declined.' });
    assert.ok(!failed.isError, failed.text);
    const path = /^Saved (\S+) /.exec(failed.text)[1];
    assert.match(failed.text, /impact 4/);

    // Another attempt of the same intended action: same id, same record.
    const again = await log.begin(subjectOf('2'), { id });
    assert.ok(!again.isError, again.text);
    await log.record(subjectOf('2'), { id, outcome: 'success', observed: 'Paid on the second attempt.' });
    const files = await readdir(join(directory, 'actions/2026-11-01-0900-pay'));
    assert.equal(files.length, 1, 'retries stay one record');
    const content = await readFile(join(directory, path), 'utf8');
    const summary = parseActionRecord(path, content);
    assert.deepEqual({ outcome: summary.outcome, impact: summary.impact, attempts: summary.attempts }, { outcome: 'success', impact: 4, attempts: 2 });
    assert.match(content, /failed: Card declined/, 'the rejected attempt stays visible in its history');

    // A repeated successful effect is a separate real action, never hidden in the first record.
    const repeated = await log.begin(subjectOf('3'), { id });
    assert.equal(repeated.isError, true);
    assert.match(repeated.text, /second real effect/);
});

test('external activity: two actually executed effects stay two records, linked by their relationship', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk two effects');
    const { log } = plainLog(directory);
    const first = /^Saved (\S+) .*id (act-[a-z0-9]+)/.exec((await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'client@example.test', outcome: 'success', impact: 2 })).text);
    const second = /^Saved (\S+) /.exec((await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'client@example.test', outcome: 'success', impact: 2, related_to: first[2] })).text);
    assert.notEqual(first[1], second[1]);
    assert.equal(parseActionRecord(second[1], await readFile(join(directory, second[1]), 'utf8')).related, first[2]);
    const view = await log.activity({ grouping: 'ungrouped' });
    assert.equal(view.totals.count, 2);
    assert.equal(view.totals.impact.toFixed(6), Math.log10(200).toFixed(6), 'both effects count');
});

test('external activity: estimates are validated, unknown is explicit, and a reassessment keeps the original', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk estimates');
    const { log } = plainLog(directory);
    for (const impact of [-1, 'high', 'NaN', 'Infinity']) {
        const rejected = await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', outcome: 'success', impact });
        assert.equal(rejected.isError, true, String(impact));
        assert.match(rejected.text, /finite nonnegative number/);
    }
    const missing = /^Saved (\S+) /.exec((await log.record(subjectOf(), { operation: 'Open email', service: 'Gmail', outcome: 'success' })).text)[1];
    const missingContent = await readFile(join(directory, missing), 'utf8');
    assert.match(missingContent, /^- \*\*Impact:\*\* unknown$/m);
    assert.equal(parseActionRecord(missing, missingContent).impact, undefined, 'unknown never becomes 0');

    const above = /^Saved (\S+) .*id (act-[a-z0-9]+)/.exec((await log.record(subjectOf(), { operation: 'Delete record', service: 'CRM', outcome: 'success', impact: 7.25, impact_reason: 'Irreversible, every customer.' })).text);
    assert.equal(parseActionRecord(above[1], await readFile(join(directory, above[1]), 'utf8')).impact, 7.25, 'fractional and above 6, unclamped');
    await log.record(subjectOf('2'), { id: above[2], outcome: 'success', impact: 3, impact_reason: 'Only a test tenant.' });
    const reassessed = await readFile(join(directory, above[1]), 'utf8');
    assert.match(reassessed, /^- \*\*Impact:\*\* 3$/m);
    assert.match(reassessed, /impact reassessed from 7\.25 to 3: Only a test tenant/);
    assert.match(reassessed, /Irreversible, every customer/, 'the original reason stays in its history');
    // A later attempt changes the record's latest state, not when the action happened.
    const summary = parseActionRecord(above[1], reassessed);
    assert.ok(summary.at);
    assert.ok(summary.recordedAt);

    // Exactly 0 is a real estimate, different from unknown.
    const zero = /^Saved (\S+) /.exec((await log.record(subjectOf(), { operation: 'Open email', service: 'Gmail', outcome: 'success', impact: 0 })).text)[1];
    assert.equal(parseActionRecord(zero, await readFile(join(directory, zero), 'utf8')).impact, 0);
    // A record from before estimates has none, and the log does not invent one.
    const legacy = 'actions/2026-01-01-old/2026-01-01-0900-send.md';
    await mkdir(join(directory, 'actions/2026-01-01-old'), { recursive: true });
    await writeFile(join(directory, legacy), '# Send email · Gmail\n\n- **Outcome:** confirmed\n- **Recorded:** 2026-01-01T09:00:00Z\n- **Action ID:** act-old\n');
    const parsed = parseActionRecord(legacy, await readFile(join(directory, legacy), 'utf8'));
    assert.deepEqual({ outcome: parsed.outcome, impact: parsed.impact, at: parsed.at }, { outcome: 'success', impact: undefined, at: '2026-01-01T09:00:00Z' });
});

test('external activity: the methodology behind an estimate stays durable and honest about what was unavailable', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk methodology');
    const project = projectAt(directory);
    const hash = 'a'.repeat(64);
    await mkdir(join(project.runtime.root, 'knowledge', 'content'), { recursive: true });
    await writeFile(join(project.runtime.root, 'knowledge', 'content', `${hash}.book`), 'AGENT External action impact\nRULE weigh consequences\n');
    const { log, persisted } = plainLog(directory);
    const methodology = {
        sources: [
            { url: 'https://ptbk.io/book/external-action-impact-1.0.0.book', via: 'Adam', book: 'agents/Adam.book', release: '1.0.0', hash, fetchedAt: '2026-11-01T09:00:00Z', availability: 'fetched' },
            { url: 'https://ptbk.io/book/gone.book', via: 'Developer', book: 'agents/Developer.book', availability: 'missing', reason: 'not cached and offline' },
        ],
        books: [{ agent: 'Developer', path: 'agents/Developer.book', revision: 'abc123' }],
    };
    const saved = await log.record(subjectOf('1', { methodology }), { operation: 'Send email', service: 'Gmail', outcome: 'success', impact: 2, impact_reason: 'One client.' });
    const path = /^Saved (\S+) /.exec(saved.text)[1];
    const content = await readFile(join(directory, path), 'utf8');
    assert.match(content, /release 1\.0\.0, sha256 a{64}/);
    assert.match(content, /gone\.book: not available when estimated \(not cached and offline\)/);
    assert.match(content, /Local Book agents\/Developer\.book \(Developer\): revision abc123/);
    const snapshot = `actions/.methodology/${hash.slice(0, 24)}.book.txt`;
    assert.match(await readFile(join(directory, snapshot), 'utf8'), /weigh consequences/, 'a durable copy outlives the ignored cache');
    assert.ok(persisted[0].paths.includes(join(directory, snapshot)), 'committed together with the record at its exact native path');
    assert.equal((await log.refresh()).total, 1, 'the methodology copies are not records');
    const read = await log.read(path);
    assert.equal(read.impactReason, 'One client.');
    assert.ok(read.methodology.some((line) => line.includes('release 1.0.0')));
    assert.ok(read.methodology.some((line) => line.includes('not available when estimated')));
});

test('external activity: a bulk operation has one record per member, shares one commit and is never absorbed by a task commit', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk batch');
    const { log, persisted, reserved } = plainLog(directory);
    const count = 12;
    await Promise.all(Array.from({ length: count }, (_, index) => log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: `reader${index}@example.test`, outcome: index === 3 ? 'failed' : 'success', impact: 1, group: 'autumn-campaign' })));
    const files = await readdir(join(directory, 'actions/2026-11-01-0900-pay'));
    assert.equal(files.length, count, 'each member has its own record, even under parallel reports');
    assert.equal(persisted.length, 0, 'the commit waits a bounded moment');
    assert.equal(reserved.length, count, 'each is reserved at once');
    assert.equal((await log.refresh()).pending, count, 'clients see saved, not committed');
    const context = await log.taskContext(subjectOf().source);
    assert.match(context, /batch "autumn-campaign": 12 recorded actions \(1 failed, 11 success\)/);
    assert.match(context, /^- failed: Send email on Gmail → reader3@example\.test/m, 'the unsuccessful member is named');
    assert.doesNotMatch(context, /^- success: Send email/m, 'a large batch does not flood the next attempt');

    assert.equal(await log.flush(), count);
    assert.equal(persisted.length, 1, 'one scoped commit for the bulk operation');
    assert.equal(persisted[0].count, count);
    assert.equal(persisted[0].paths.length, count);
    assert.equal((await log.refresh()).pending, 0);

    // A task boundary commits at once.
    await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'late@example.test', outcome: 'success', impact: 1, group: 'autumn-campaign' });
    await log.settle(subjectOf().source);
    assert.equal(persisted.length, 2);
    assert.equal((await log.refresh()).pending, 0);
});

test('external activity: a bulk operation is committed by its bounded timer, and a refused commit retries only the commit', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk batch timer');
    let failing = true;
    const { log, persisted } = plainLog(directory, { groupCommitMs: 10, failing: () => failing });
    await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'a@example.test', outcome: 'success', impact: 1, group: 'campaign' });
    await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'b@example.test', outcome: 'success', impact: 1, group: 'campaign' });
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(persisted.length, 0);
    assert.equal((await log.refresh()).pending, 2, 'still saved after the refusal');
    failing = false;
    for (let index = 0; index < 100 && !persisted.length; index++) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].count, 2);
});

test('external activity: a crash before the shared commit is recovered as one commit per operation, without repeating anything', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk batch recover');
    const { log } = plainLog(directory);
    const paths = [];
    for (const target of ['a@example.test', 'b@example.test']) paths.push(/^Saved (\S+) /.exec((await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target, outcome: 'success', impact: 1, group: 'campaign' })).text)[1]);
    const { log: next, persisted } = plainLog(directory);
    assert.equal(await next.recover(paths.map((path) => join(directory, path))), 2);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].count, 2);
});

test('external activity: engine-owned operations are listed, attributed to no task, and rebuilding the index changes nothing', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk engine listed');
    await saveEngineAction({ root: directory }, { system: 'Initialization', operation: 'Create repository', service: 'GitHub', content: 'Created.', observed: 'Done.', timeZone: 'UTC' });
    const { log } = plainLog(directory);
    await log.record(subjectOf(), { operation: 'Send email', service: 'Gmail', target: 'a@example.test', outcome: 'success', impact: 2 });
    const first = await log.activity({ grouping: 'task', showAll: true });
    assert.equal(first.totals.count, 2);
    const engine = first.rows.find((row) => row.task === '.engine/initialization');
    assert.ok(engine, 'the engine operation has its own honest branch');
    assert.match(engine.label, /^No task · Initialization/);
    assert.equal(engine.totals.unknown, 1, 'no agent estimated it, so no score is invented');

    // A corrupt or deleted index is only a cold start.
    const index = join(projectAt(directory).runtime.temporary, 'external-activity-index.json');
    await mkdir(projectAt(directory).runtime.temporary, { recursive: true });
    for (const damage of ['not json', JSON.stringify({ version: 2, files: { 'actions/x.md': {} } })]) {
        await writeFile(index, damage);
        const { log: fresh } = plainLog(directory);
        const rebuilt = await fresh.activity({ grouping: 'task', showAll: true });
        assert.deepEqual(rebuilt.rows.map((row) => [row.key, row.totals.count, row.totals.impact]), first.rows.map((row) => [row.key, row.totals.count, row.totals.impact]));
    }
    await rm(index, { force: true });
    const { log: fresh } = plainLog(directory);
    const again = await fresh.activity({ grouping: 'task', showAll: true });
    assert.deepEqual(again.rows.map((row) => [row.key, row.totals.count, row.totals.impact]), first.rows.map((row) => [row.key, row.totals.count, row.totals.impact]));
});

test('external activity: the detail links a harness session only while it is known', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk harness link');
    const known = new Set(['codex/abc']);
    const { log } = plainLog(directory, { sessionKnown: (handle) => known.has(handle) });
    const tool = log.tools(subjectOf(), { session: () => 'codex/abc' }).find((item) => item.name === 'record_external_action');
    const path = /^Saved (\S+) /.exec((await tool.handler({ operation: 'Publish post', service: 'LinkedIn', outcome: 'success', impact: 3 })).text)[1];
    assert.equal((await log.read(path)).links.harness, 'codex/abc');
    known.clear();
    assert.equal((await log.read(path)).links.harness, undefined);
});
