import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ActionLog, parseActionRecord, renderActionRecord } from '../dist/engine/action-log.js';
import { projectAt } from '../dist/project/workspace.js';
import { actionDirectoryOf, traceDirectoryOf } from '../dist/tasks/identity.js';
import { drive, findGenerated, git, initializedProject, messages, ptbk, rawSubjects, subjects, temporaryDirectory } from './helpers.mjs';

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
        reference: '<msg-1>',
        history: ['2026-10-29T10:00:00+01:00 — intent recorded before the request (attempt r1-a1)', '2026-10-29T10:00:05+01:00 — confirmed (attempt r1-a1)'],
        closed: true,
        record: 'actions/2026-10-29-newsletter/x.md',
    };
    const summary = parseActionRecord('actions/2026-10-29-newsletter/x.md', renderActionRecord(intent, 'a'.repeat(40)));
    assert.deepEqual(
        { operation: summary.operation, service: summary.service, outcome: summary.outcome, agent: summary.agent, taskName: summary.taskName, source: summary.source, id: summary.id, at: summary.at, reference: summary.reference, task: summary.task },
        { operation: 'Send email', service: 'Gmail', outcome: 'confirmed', agent: '@Developer', taskName: 'Weekly newsletter', source: 'tasks/2026-10-29-newsletter.book', id: 'act-abc123', at: '2026-10-29T10:00:05+01:00', reference: '<msg-1>', task: '2026-10-29-newsletter' },
    );
    assert.equal(actionDirectoryOf('tasks/2026-10-29 Newsletter.book'), 'actions/2026-10-29 Newsletter', 'the same literal basename as traces');
    assert.equal(actionDirectoryOf('tasks/2026-10-29 Newsletter.book').slice('actions/'.length), traceDirectoryOf('tasks/2026-10-29 Newsletter.book').slice('traces/'.length));
});

test('action records: an effect whose record was removed (e.g. by a Git revert) stays in the next attempt’s context and its evidence is not pruned', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk actions');
    const log = new ActionLog({ project: projectAt(directory), env: {}, timeZone: () => 'UTC', persist: async () => 'uncommitted', onChange: () => undefined, log: () => undefined });
    const subject = { taskName: 'Send the newsletter', source: 'tasks/2026-10-30-0900-send-the-newsletter.book', agent: '@Developer', attempt: '1', trace: 'traces/2026-10-30-0900-send-the-newsletter/' };
    const saved = await log.record(subject, { operation: 'Send email', service: 'Gmail', target: 'team@example.com', outcome: 'confirmed', observed: 'Sent.' });
    const path = /^Saved (\S+) /.exec(saved.text)[1];
    const id = /, id (act-[a-z0-9]+)/.exec(await log.taskContext(subject.source))[1];
    await rm(join(directory, path));
    const context = await log.taskContext(subject.source);
    assert.match(context, new RegExp(`^- confirmed: Send email on Gmail → team@example\\.com \\(.*, id ${id}\\) — its record \`${path}\` was removed from the project`, 'm'), 'the effect is still known, so it is reconciled instead of repeated');
    await log.prune(0);
    assert.match(await log.taskContext(subject.source), /was removed from the project/, 'the only remaining evidence is not pruned');
    // Reconciling it by its id restores the same record (no duplicate).
    await log.record({ ...subject, attempt: '2' }, { id, outcome: 'confirmed', observed: 'The sent message is in the mailbox.' });
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
    const linked = await path(await log.record(subject('tasks/2026-10-30-0900-post-news.book', 'traces/2026-10-30-0900-post-news/'), { operation: 'Publish post', service: 'LinkedIn', outcome: 'confirmed', reference: 'https://www.linkedin.test/posts/42' }));
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
    assert.match(byOperation['Send email'].content, /^- \*\*Outcome:\*\* confirmed$/m);
    assert.match(byOperation['Send email'].content, /token=\[REDACTED\]/, 'secret URL parameters are redacted before storage');
    assert.doesNotMatch(byOperation['Send email'].content, /SECRETTOKEN/);
    assert.match(byOperation['Publish post'].content, /^- \*\*Outcome:\*\* confirmed$/m, 'the uncertain post was reconciled in place');
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
