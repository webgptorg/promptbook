import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { appendBrief, latestBriefOf, newReportBook, readLatestBrief } from '../dist/engine/report.js';
import { appendChatMessage } from '../dist/chats/chat-book.js';
import { projectAt } from '../dist/project/workspace.js';
import { ChatStore } from '../dist/chats/store.js';
import { findGenerated, git, initializedProject, messages, ptbk, rawSubjects, subjects, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Status snapshot of a project as JSON.
 */
async function status(project, env) {
    return JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
}

test('report feed: briefs are appended in order; only the last complete Chatter message is current, also in a very long feed', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk report');
    assert.deepEqual(await readLatestBrief(directory), { path: 'report.book', state: 'missing' });
    await appendBrief(directory, { text: 'First brief.', at: '2026-10-29T10:00:00+01:00' });
    await appendBrief(directory, { text: 'Second brief.\nCHAT MESSAGE @User looks like a commitment but is text.', at: '2026-10-29T10:15:00+01:00' });
    const source = await readFile(join(directory, 'report.book'), 'utf8');
    assert.match(source, /^CHAT Report\nCHAT MEMBER @Chatter\n/, 'a stable undated CHAT Report with Chatter alone');
    assert.doesNotMatch(source, /CHAT STATUS|@User\n/, 'no status line and no User member');
    assert.equal((await readLatestBrief(directory)).brief.text, 'Second brief.\nCHAT MESSAGE @User looks like a commitment but is text.', 'literal text stays text');
    assert.equal(latestBriefOf(appendChatMessage(source, { sender: '@Chatter', at: '2026-10-29T10:20:00+01:00', text: 'Half written', phase: 'progress' })).text, 'Second brief.\nCHAT MESSAGE @User looks like a commitment but is text.', 'progress never replaces the last good brief');
    // A feed far larger than the tail that is read: the last brief is found without parsing the whole history.
    let long = newReportBook();
    for (let index = 0; index < 4000; index++) long = appendChatMessage(long, { sender: '@Chatter', at: `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}+01:00`, text: `Brief ${index}: ${'filler '.repeat(20)}` });
    await writeFile(join(directory, 'report.book'), long);
    assert.ok(long.length > 512 * 1024);
    assert.match((await readLatestBrief(directory)).brief.text, /^Brief 3999: /);
});

test('project brief: Chatter appends briefs independently of viewers; status reads the saved one; refresh waits for pause; Discuss seeds a new chat', async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    // Only the first brief and the explicit refresh generate within the fixture (the regular cadence is far away).
    const env = { ...baseEnv, PTBK_REPORT_INTERVAL_MS: '600000' };
    const before = await ptbk(['status', '--raw'], { cwd: project, env });
    assert.equal(before.code, 0, before.output);
    assert.match(before.stdout, /^Brief: no brief yet/m, 'a stopped project without a brief says so honestly');

    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), { message: 'the Expert bootstrap result' });
    const first = await waitFor(async () => (await status(project, env)).report?.brief, { message: 'the first brief', timeoutMs: 90_000 });
    assert.match(first.text, /^Fixture brief number 1: [1-9]\d* recent result\(s\) are done/, 'Chatter wrote it from the engine digest');
    const report = await readFile(join(project, 'report.book'), 'utf8');
    assert.match(report, /^CHAT Report\nCHAT MEMBER @Chatter\n/);
    assert.ok((await rawSubjects(project)).some((subject) => /^ptbk: `[^`]+` Chat - Report$/.test(subject)), 'Chatter’s scoped report commit');
    assert.ok((await messages(project)).some((message) => /^ptbk: Chat - Report\n/.test(message) && /^Chat-Name: Report$/m.test(message)));
    assert.equal((await git(project, ['status', '--porcelain', '--', 'report.book'])).trim(), '');

    // Reading never generates: several status reads leave the feed and history unchanged.
    const commits = (await rawSubjects(project)).length;
    const turns = (await readFile(log, 'utf8')).split('\n').filter((line) => line.includes('"brief":true')).length;
    for (let index = 0; index < 3; index++) assert.match((await ptbk(['status', '--raw'], { cwd: project, env })).stdout, /^Brief: Fixture brief number 1: /m);
    assert.equal((await readFile(log, 'utf8')).split('\n').filter((line) => line.includes('"brief":true')).length, turns, 'no generation on read');
    assert.equal(await readFile(join(project, 'report.book'), 'utf8'), report);

    // Refresh waits while paused (it never resumes Chatter secretly) and runs after Resume.
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status(project, env)).service.state === 'pause', { message: 'the pause' });
    const { lookupService } = await import('../dist/service/control.js');
    const lookup = await lookupService(projectAt(project));
    const requested = await lookup.client.request('report-refresh');
    assert.match(requested.outcome, /paused/);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const paused = await status(project, env);
    assert.ok(paused.report.requestedAt, 'the request is visible');
    assert.equal(paused.report.brief.at, first.at, 'the saved brief stays while the request waits');
    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    const second = await waitFor(async () => {
        const brief = (await status(project, env)).report?.brief;
        return brief && brief.at !== first.at ? brief : undefined;
    }, { message: 'the requested brief after resume', timeoutMs: 60_000 });
    assert.match(second.text, /^Fixture brief number 2: /, 'the previous brief is part of its context');
    const feed = await readFile(join(project, 'report.book'), 'utf8');
    assert.ok(feed.startsWith(report.trimEnd()), 'earlier briefs are preserved in order (append only)');
    assert.ok((await rawSubjects(project)).length > commits);

    // Discuss a displayed (older) brief: a distinct new chat starting with exactly that snapshot.
    const discussed = await lookup.client.request('report-discuss', { at: first.at });
    const listed = JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout);
    assert.ok(listed.some((item) => item.name === discussed.chat && item.humanFacing), discussed.outcome);
    const stored = await new ChatStore(projectAt(project), { timeZone: 'UTC' }).find(discussed.chat);
    assert.match(stored.relativePath, /^chats\/\d{4}-\d{2}-/, 'a normal date-named chat in chats/');
    const [firstMessage] = stored.chat.messages;
    assert.equal(stored.chat.messages.length, 1, 'no model call merely repeats the brief');
    assert.equal(firstMessage.text, first.text, 'the exact displayed brief');
    assert.equal(firstMessage.at, first.at, 'with its original time');
    assert.equal(firstMessage.senderKey, 'chatter');
    assert.deepEqual(stored.chat.links, ['@Report'], 'provenance links the report (canonical reference of the one-word name)');
    assert.doesNotMatch(await readFile(join(project, 'report.book'), 'utf8'), /@User/, 'User never joins the report feed');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.match((await ptbk(['status', '--raw'], { cwd: project, env })).stdout, /^Brief: Fixture brief number 2: /m, 'status reads the saved brief with the service stopped');
});

test('project brief: a failed brief gets cause-aware automatic rechecks instead of a Retry question; a failed commit resumes only the commit, also after a restart', async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    // Two provider outages (the first brief and its first recheck); the regular cadence is far away.
    const env = { ...baseEnv, PTBK_REPORT_INTERVAL_MS: '600000', PTBK_REPORT_RECHECK_MS: '3000', FAKE_CODEX_FAIL_BRIEFS: '2' };
    // A hook rejects the first commit of the brief once (like a signing or policy problem).
    const marker = join(project, '..', 'reject-brief-once');
    await writeFile(marker, '');
    await writeFile(join(project, '.git', 'hooks', 'pre-commit'), `#!/bin/sh\nif git diff --cached --name-only | grep -qx report.book && [ -f "${marker}" ]; then rm -f "${marker}"; echo 'Fixture hook rejects the brief once.' >&2; exit 1; fi\n`, { mode: 0o755 });
    const briefTurns = async () => (await readFile(log, 'utf8')).split('\n').filter((line) => line.includes('"brief":true')).length;

    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const first = await waitFor(async () => (await status(project, env)).report?.recheck, { message: 'the recheck of the failed first brief', timeoutMs: 90_000 });
    assert.match(first.cause, /Fixture outage/, 'the actual cause is shown');
    // The recheck runs by itself; the same failure under unchanged tools backs off instead of repeating at once.
    const second = await waitFor(async () => {
        const recheck = (await status(project, env)).report?.recheck;
        return recheck?.rounds === 2 ? recheck : undefined;
    }, { message: 'the second automatic recheck', timeoutMs: 30_000 });
    assert.ok(Date.parse(second.nextAt) - Date.parse(first.nextAt) >= 9_000, `the second round waits longer (${first.nextAt} → ${second.nextAt})`);
    const failing = await status(project, env);
    assert.equal(failing.report.state, 'missing', 'no brief is invented');
    assert.equal(failing.chats.waiting.length, 0, 'nobody is asked to retry');
    assert.equal(await briefTurns(), 2);
    assert.match((await ptbk(['status', '--raw'], { cwd: project, env })).stdout, /^Brief: no brief yet \(the last update failed \(.*Fixture outage.*\); automatic retry /m);

    // An explicit Refresh is newer than the waiting recheck and brings it forward.
    const { lookupService } = await import('../dist/service/control.js');
    const requested = await (await lookupService(projectAt(project))).client.request('report-refresh');
    assert.match(requested.outcome, /tries again now/);
    const written = await waitFor(async () => {
        const report = (await status(project, env)).report;
        return report?.brief && report.isCommitPending ? report : undefined;
    }, { message: 'the brief saved with its commit pending', timeoutMs: 30_000 });
    assert.match(written.brief.text, /^Fixture brief number 1: /);
    assert.equal(written.recheck, undefined, 'a written brief ends the recheck');
    assert.equal(await briefTurns(), 3, 'one generation per attempt, no paid loop');
    assert.notEqual((await git(project, ['status', '--porcelain', '--', 'report.book'])).trim(), '', 'the rejected brief stays saved, uncommitted');
    assert.match((await ptbk(['status', '--raw'], { cwd: project, env })).stdout, /^Brief: Fixture brief number 1: .*saved, but its commit is pending/m);

    // A restart resumes only the commit (no new generation).
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await git(project, ['status', '--porcelain', '--', 'report.book'])).trim() === '', { message: 'the brief committed after the restart', timeoutMs: 30_000 });
    assert.ok((await messages(project)).some((message) => /^ptbk: Chat - Report\n/.test(message) && /^Chat-Name: Report$/m.test(message)), 'Chatter’s scoped report commit');
    await waitFor(async () => (await status(project, env)).report?.isCommitPending === undefined, { message: 'no pending commit anymore' });
    assert.equal(await briefTurns(), 3, 'the brief is not generated again');
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
