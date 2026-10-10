import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverTasks, parseBook, parseMarkdown, serializeTaskBook, updateTaskStatus } from '../dist/coder/sources.js';
import { bindSchedule, evaluateEligibility, parseDate, parseInterval } from '../dist/coder/schedule.js';
import { migrateTasks } from '../dist/coder/migrate.js';

/** Make a disposable project without writing runtime state implicitly. */
async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'ptbk-source-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, 'prompts'));
    await mkdir(path.join(root, 'tasks'));
    return { projectPath: root, tasksPath: path.join(root, 'tasks'), legacyPath: path.join(root, 'prompts'), statePath: path.join(root, '.promptbook', 'ptbk-coder'), timezone: 'Europe/Prague' };
}

/** A valid Book definition shared by round-trip and eligibility fixtures. */
function book(content = 'Do the work.', controls = '') {
    return `Work\n\nTASK\nMETA ID work\nSTATUS todo\n${controls}\nPROMPT\n${content}\n`;
}

test('legacy status belongs to the first line, and every lifecycle marker is preserved', () => {
    for (const [marker, status] of [[' ', 'todo'], ['-', 'not-ready'], ['.', 'not-ready'], ['^', 'in-progress'], ['x', 'done'], ['X', 'done'], ['!', 'failed']]) {
        const [task] = parseMarkdown(`[${marker}] !! use \`gpt\` \`opus\`\n\nTask\n[ ] acceptance`, '/tmp/work.md', 'UTC');
        assert.equal(task.status, status);
        assert.equal(task.priority, 2);
        assert.deepEqual(task.runners, ['gpt', 'opus']);
    }
    const [markerless] = parseMarkdown('🧪 Test\n[!] Body checklist', '/tmp/plain.md', 'UTC');
    assert.equal(markerless.status, 'todo');
    assert.equal(markerless.priority, 0);
    assert.equal(markerless.payload, '🧪 Test\n[!] Body checklist');
});

test('legacy discovery ignores README, explicit ignore and nested archives, using a stable mixed sort', async (t) => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.legacyPath, 'README.md'), 'documentation');
    await writeFile(path.join(workspace.legacyPath, 'ignored.md'), '<!--ptbk-coder-ignore-->\nWork');
    await writeFile(path.join(workspace.legacyPath, 'b.md'), '[ ] !!\nB\n---\n[ ] !!\nB2');
    await writeFile(path.join(workspace.legacyPath, 'a.md'), '[ ] !!\nA');
    await mkdir(path.join(workspace.legacyPath, 'done'));
    await writeFile(path.join(workspace.legacyPath, 'done', 'hidden.md'), 'hidden');
    await writeFile(path.join(workspace.tasksPath, 'z.book'), book('Z', 'PRIORITY 3'));
    assert.deepEqual((await discoverTasks(workspace)).map((task) => task.title), ['Work', 'A', 'B', 'B2']);
    assert.rejects(readFile(path.join(workspace.statePath, 'migration.json')));
});

test('only date-shaped control tokens schedule work; routing model names and body dates stay literal', () => {
    const [task] = parseMarkdown('[ ] \`gpt-4.1-2025-04-14\` \`2028-02-29 09:30+01:00\`\nBody 2040-01-01', '/tmp/work.md', 'UTC');
    assert.deepEqual(task.runners, ['gpt-4.1-2025-04-14']);
    assert.equal(task.after, Date.parse('2028-02-29T08:30:00Z'));
    assert.equal(task.diagnostics.length, 0);
    const [body] = parseMarkdown('[ ]\n\`2028-02-29\` in body', '/tmp/work.md', 'UTC');
    assert.equal(body.after, undefined);
    const [invalid] = parseMarkdown('[ ] \`2027-02-29\`\nWork', '/tmp/work.md', 'UTC');
    assert.equal(evaluateEligibility(invalid, { now: Date.now(), timezone: 'UTC' }).kind, 'invalid');
});

test('strict dates validate leap days, timezone boundaries, and both DST gaps and overlaps', () => {
    assert.equal(parseDate('2028-02-29', 'UTC'), Date.parse('2028-02-29T00:00:00Z'));
    assert.equal(parseDate('2026-10-30 09:30:00.125+01:00', 'UTC'), Date.parse('2026-10-30T08:30:00.125Z'));
    assert.equal(parseDate('2026-10-30T09:30', 'Europe/Prague'), Date.parse('2026-10-30T08:30:00Z'));
    for (const date of ['2027-02-29', '2026-13-01', '2026-10-30 24:00', '2026-10-30T09:30+24:00', '2026-10-30T09:30:00.1234Z', 'tomorrow']) assert.throws(() => parseDate(date, 'UTC'));
    assert.throws(() => parseDate('2026-03-29T02:30', 'Europe/Prague'), /Nonexistent/);
    assert.throws(() => parseDate('2026-10-25T02:30', 'Europe/Prague'), /Ambiguous/);
    assert.equal(parseDate('2026-10-25T02:30+02:00', 'Europe/Prague'), Date.parse('2026-10-25T00:30:00Z'));
});

test('Book dialect requires declaration, ID, status, singletons and supported control fields', () => {
    assert.equal(parseBook('Agent\n\nPERSONA An agent\nGOAL Help', '/tmp/agent.book', 'UTC'), null);
    for (const controls of ['META ID duplicate', 'STATUS done', 'PRIORITY -1', 'AFTER nonsense', 'REPEAT P1M', 'DEPENDS ON other']) {
        const task = parseBook(book('Work', controls), '/tmp/work.book', 'UTC');
        assert.ok(task.diagnostics.length, controls);
    }
    assert.ok(parseBook('Work\nTASK\nPROMPT\nWork', '/tmp/work.book', 'UTC').diagnostics.some((diagnostic) => diagnostic.includes('Missing STATUS')));
});

test('literal JSON round-trip preserves Unicode, trailing newlines, executable-looking content and metadata', () => {
    const task = parseBook(book('Initial', 'META NOTE historical attribution\nMETA CUSTOM keep me'), '/tmp/work.book', 'UTC');
    task.payload = '🦊 Čau\r\nMODEL dangerous\nRULE literal\n```ts\nconst x = "quotes";\n```\n---\n\n';
    task.rules = ['RULE literal\n```\n🧪\n```\n'];
    const restored = parseBook(serializeTaskBook(task), '/tmp/work.book', 'UTC');
    assert.equal(restored.payload, task.payload);
    assert.deepEqual(restored.rules, task.rules);
    assert.deepEqual(restored.metadata, task.metadata);
    assert.deepEqual(restored.diagnostics, []);
    const malformed = parseBook(book('```ptbk-task-literal-json\n{"not":"string"}\n```'), '/tmp/work.book', 'UTC');
    assert.ok(malformed.diagnostics.length);
});

test('duplicate task IDs visibly block every conflicting definition', async (t) => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.tasksPath, 'a.book'), book());
    await writeFile(path.join(workspace.tasksPath, 'b.book'), book());
    const tasks = await discoverTasks(workspace);
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every((task) => evaluateEligibility(task, { now: Date.now(), timezone: 'UTC' }).kind === 'invalid'));
});

test('status updates preserve CRLF, annotation and surrounding sections and reject concurrent edits', async (t) => {
    const workspace = await fixture(t);
    const file = path.join(workspace.legacyPath, 'work.md');
    const original = 'First content\r\n[ ] acceptance\r\n---\r\n[ ] !! \`gpt\`\r\nSecond\r\n';
    await writeFile(file, original);
    let [first, second] = await discoverTasks(workspace);
    const target = [first, second].find((task) => task.source.sectionIndex === 1);
    await updateTaskStatus(target, 'in-progress');
    assert.equal(await readFile(file, 'utf8'), original.replace('[ ] !!', '[^] !!'));
    [first] = (await discoverTasks(workspace)).filter((task) => task.source.sectionIndex === 0);
    await updateTaskStatus(first, 'in-progress');
    assert.ok((await readFile(file, 'utf8')).startsWith('[^]\r\nFirst content\r\n[ ] acceptance'));
    const [current] = await discoverTasks(workspace);
    await writeFile(file, `${await readFile(file, 'utf8')}Concurrent editor\r\n`);
    await assert.rejects(updateTaskStatus(current, 'done'), /changed concurrently/);
    assert.ok((await readFile(file, 'utf8')).endsWith('Concurrent editor\r\n'));
});

test('typed routing is AND, legacy routing is OR, and priority boundaries are inclusive', () => {
    const task = parseBook(book('Work', 'AGENT Developer\nHARNESS openai-codex\nMODEL gpt-5\nRUNNER gpt\nRUNNER opus\nPRIORITY 2\nAFTER 2026-10-30T09:00Z'), '/tmp/work.book', 'UTC');
    const context = { now: task.after, timezone: 'UTC', harness: 'openai-codex', model: 'gpt-5', agent: 'Developer', minPriority: 2, maxPriority: 2 };
    assert.equal(evaluateEligibility(task, context).kind, 'ready');
    assert.equal(evaluateEligibility(task, { ...context, now: task.after - 1 }).kind, 'waiting-until');
    assert.equal(evaluateEligibility(task, { ...context, harness: 'claude-code' }).kind, 'filtered');
    assert.equal(evaluateEligibility(task, { ...context, maxPriority: 1 }).kind, 'filtered');
});

test('recurrence is fixed, coalesced, anchored and gated by persisted recovery', () => {
    for (const spelling of ['1w', '7d', 'every 1 week', 'P7D', 'P1W']) assert.equal(parseInterval(spelling), 604800000);
    for (const invalid of ['0s', '-1w', '1.5h', 'P1M', 'P1Y', 'Infinity', '999999999999999w']) assert.throws(() => parseInterval(invalid));
    const task = parseBook(book('Work', 'AFTER 2026-10-30T09:00Z\nREPEAT 1w'), '/tmp/work.book', 'UTC');
    const context = { now: task.after + task.repeat * 10 + 5, timezone: 'UTC' };
    assert.equal(evaluateEligibility(task, context).dueSlot, task.after + task.repeat * 10);
    const state = { anchor: task.after, scheduleRevision: task.scheduleRevision, lastConsumedSlot: task.after + task.repeat * 10 };
    assert.equal(evaluateEligibility(task, context, state).nextWakeUp, task.after + task.repeat * 11);
    assert.equal(evaluateEligibility(task, { ...context, now: context.now + task.repeat * 4 }, { ...state, blocked: true }).kind, 'blocked');
    const equivalent = parseBook(book('Work', 'AFTER 2026-10-30T10:00+01:00\nREPEAT 7d'), '/tmp/renamed.book', 'UTC');
    assert.equal(equivalent.scheduleRevision, task.scheduleRevision);
    const unanchored = parseBook(book('Work', 'REPEAT 30m'), '/tmp/work.book', 'UTC');
    assert.match(evaluateEligibility(unanchored, context).reason, /anchor will be saved/);
    assert.equal(evaluateEligibility(unanchored, context, { anchor: context.now, scheduleRevision: unanchored.scheduleRevision, lastConsumedSlot: context.now }).kind, 'waiting-until');
});

test('migration dry-run is side-effect-free; real migration is literal, asset-aware and idempotent', async (t) => {
    const workspace = await fixture(t);
    const file = path.join(workspace.legacyPath, 'work.md');
    const bytes = '[ ] !! \`gpt\` \`2026-10-30T09:00Z\`\nFirst\n![asset](screenshots/example.png)\n```\nMODEL literal\n```\n---\n[-]\nDraft @@@\n';
    await writeFile(file, bytes);
    const preview = await migrateTasks(workspace, { dryRun: true });
    assert.equal(preview.plan[0].destinations.length, 2);
    assert.deepEqual(await readdir(workspace.tasksPath), []);
    await assert.rejects(readFile(path.join(workspace.statePath, 'migration.json')));
    const result = await migrateTasks(workspace, {}, { assertOwned() {} });
    assert.equal(result.created.length, 2);
    const tasks = await discoverTasks(workspace);
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every((task) => task.source.format === 'book' && !task.diagnostics.length));
    assert.match(tasks[0].payload, /\.\.\/prompts\/screenshots\/example.png/);
    assert.match(tasks[0].payload, /MODEL literal/);
    assert.equal(tasks[1].status, 'not-ready');
    assert.equal(await readFile(result.archived[1], 'utf8'), bytes);
    assert.deepEqual(await migrateTasks(workspace, {}, { assertOwned() {} }), { created: [], archived: [], plan: [] });
});

test('interrupted migration keeps exactly one authoritative representation and resumes safely', async (t) => {
    for (const stopAt of [1, 2, 3, 4, 5, 6]) {
        const workspace = await fixture(t);
        await writeFile(path.join(workspace.legacyPath, 'work.md'), '[ ]\nWork');
        let assertions = 0;
        await assert.rejects(migrateTasks(workspace, {}, { assertOwned() { if (++assertions === stopAt) throw new Error('Simulated process interruption'); } }), /interruption/);
        const tasks = await discoverTasks(workspace);
        assert.equal(tasks.filter((task) => evaluateEligibility(task, { now: Date.now(), timezone: 'UTC' }).kind === 'ready').length, 1, `Transaction boundary ${stopAt}`);
        await migrateTasks(workspace, {}, { assertOwned() {} });
        assert.equal((await discoverTasks(workspace)).length, 1);
    }
});

test('migration refuses source edits, destination collisions and workspace symlink escape', async (t) => {
    const workspace = await fixture(t);
    await writeFile(path.join(workspace.legacyPath, 'work.md'), '[ ]\nWork');
    await writeFile(path.join(workspace.tasksPath, 'work-1.book'), 'User content');
    await assert.rejects(migrateTasks(workspace, { dryRun: true }), /collision/);
    const external = await mkdtemp(path.join(os.tmpdir(), 'ptbk-escape-'));
    t.after(() => rm(external, { recursive: true, force: true }));
    await writeFile(path.join(external, 'escape.book'), book());
    await symlink(path.join(external, 'escape.book'), path.join(workspace.tasksPath, 'escape.book'));
    await assert.rejects(discoverTasks(workspace), /escapes project/);
});

test('legacy identity survives relocated workspaces and status updates', async (t) => {
    const original = await fixture(t);
    const relocated = await fixture(t);
    for (const workspace of [original, relocated]) await writeFile(path.join(workspace.legacyPath, 'stable.md'), '[ ]\nStable task\n---\n[ ]\nSecond task');
    const tasks = await discoverTasks(original);
    assert.deepEqual((await discoverTasks(relocated)).map((task) => task.id), tasks.map((task) => task.id));
    assert.equal((await updateTaskStatus(tasks[0], 'in-progress')).id, tasks[0].id);
});

test('remote primary agent Book fields remain HTTPS references through round-trip', () => {
    const task = parseBook(book('Work', 'AGENT {https://never-read.invalid/roles/../developer.book}'), '/tmp/work.book', 'UTC');
    assert.equal(task.agent, 'https://never-read.invalid/developer.book');
    assert.deepEqual(task.diagnostics, []);
    assert.equal(parseBook(serializeTaskBook(task), '/tmp/work.book', 'UTC').agent, task.agent);
    for (const url of ['http://never-read.invalid/developer.book', 'https://username:credential@never-read.invalid/developer.book']) {
        assert.ok(parseBook(book('Work', `AGENT {${url}}`), '/tmp/work.book', 'UTC').diagnostics.length);
    }
});

test('activated local schedules retain their timezone after restart and cosmetic edits', async (t) => {
    const workspace = await fixture(t);
    const file = path.join(workspace.tasksPath, 'weekly.book');
    await writeFile(file, book('Work', 'AFTER 2026-10-30 09:00\nREPEAT 1w'));
    const [original] = await discoverTasks(workspace);
    const state = { timezone: 'Europe/Prague', afterRaw: original.afterRaw, anchor: original.after, scheduleRevision: original.scheduleRevision, lastConsumedSlot: original.after };
    const reparsed = parseBook(await readFile(file, 'utf8'), file, 'America/New_York');
    assert.notEqual(reparsed.after, original.after);
    const bound = bindSchedule(reparsed, state, 'America/New_York');
    assert.equal(bound.after, original.after);
    assert.equal(bound.scheduleRevision, original.scheduleRevision);
    assert.equal(bound.scheduleTimezone, 'Europe/Prague');
    await mkdir(workspace.statePath, { recursive: true });
    await writeFile(path.join(workspace.statePath, 'occurrences.json'), JSON.stringify({ version: 1, tasks: { work: state } }));
    await writeFile(file, book('Work', 'AFTER 2026-10-30T09:00:00.000\nREPEAT 7d'));
    const [discovered] = await discoverTasks({ ...workspace, timezone: 'America/New_York' });
    assert.equal(discovered.after, original.after);
    assert.equal(discovered.scheduleRevision, original.scheduleRevision);
    const result = evaluateEligibility(discovered, { now: original.after + original.repeat - 1, timezone: 'America/New_York' }, state);
    assert.equal(result.kind, 'waiting-until');
    assert.equal(result.nextWakeUp, original.after + original.repeat);
    await writeFile(file, book('Work', 'AFTER 2026-10-31T09:00\nREPEAT 1w'));
    const [edited] = await discoverTasks({ ...workspace, timezone: 'America/New_York' });
    assert.equal(edited.scheduleTimezone, 'America/New_York');
    assert.notEqual(edited.scheduleRevision, original.scheduleRevision);
});
