import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { StateStore } from '../dist/engine/state.js';
import { isOutstandingReceipt, receiptLine, TaskControlStore } from '../dist/engine/task-control.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { findGenerated, git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

/** Accepts every output. */
const CHECK = 'process.exit(0);\n';

/** Status snapshot of a project as JSON. */
async function status(project, env) {
    return JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
}

/** Sends one control request to the project's engine. */
async function control(project, method, params = {}) {
    const record = await readProcessRecord(projectAt(project));
    return await new ControlClient(projectAt(project), record).request(method, params, 60_000);
}

/** The Book of a task, by the start of its name. */
async function bookOf(project, start) {
    const files = (await git(project, ['ls-files', 'tasks'])).trim().split('\n');
    for (const file of files) {
        const text = await readFile(join(project, file), 'utf8');
        if (text.startsWith(`TASK ${start}`)) return { path: join(project, file), text };
    }
    return undefined;
}

/** The turns the fixture logged. */
async function turns(log) {
    return (await readFile(log, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

/** A store in a temporary directory. */
async function store(t) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-control-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const state = new StateStore(directory);
    return { state, control: new TaskControlStore(state) };
}

const CHANGE = { change: 'c1', task: 'Report', source: 'tasks/report.book', order: 4 };

test('receipts keep Saved, Delivered and Applied apart, per session, and a restart never turns a lost acknowledgement into evidence', async (t) => {
    const { state, control: receipts } = await store(t);
    await receipts.mark(CHANGE, undefined, 'saved', 'No turn is running.', 'Its next start receives it.');
    assert.equal(receipts.receiptsOf(CHANGE.source)[0].state, 'saved');
    assert.match(receiptLine(receipts.receiptsOf(CHANGE.source)[0]), /^Saved: .*Next: Its next start receives it\./);
    await receipts.advance(CHANGE.source, ['c1'], 'hs-1', 'delivered', 'The harness accepted the turn that contains it.');
    assert.equal(receipts.receiptsOf(CHANGE.source)[0].state, 'delivered', 'a turn that started is delivery');
    assert.equal(receipts.receiptsOf(CHANGE.source)[0].session, 'hs-1', 'it is now the receipt of that session');
    assert.deepEqual(receipts.receiptsOf(CHANGE.source)[0].history.map((entry) => entry.state), ['saved']);
    await receipts.mark(CHANGE, 'hs-2', 'queued', 'A second session has it too.');
    assert.equal(receipts.receiptsOf(CHANGE.source).length, 2, 'each session has its own evidence');

    const reloaded = new TaskControlStore(state);
    await reloaded.load();
    const after = reloaded.receiptsOf(CHANGE.source);
    assert.equal(after.find((receipt) => receipt.session === 'hs-1').state, 'uncertain', 'no processing was observed before the engine stopped');
    assert.equal(after.find((receipt) => receipt.session === 'hs-2').state, 'deferred', 'not delivered is not lost');
    await reloaded.advance(CHANGE.source, ['c1'], 'hs-1', 'applied', 'The turn that received it completed.');
    assert.equal(isOutstandingReceipt(reloaded.receiptsOf(CHANGE.source).find((receipt) => receipt.session === 'hs-1')), false);
    assert.equal(reloaded.view().receipts.filter(isOutstandingReceipt).length, 1, 'the other session still shows as outstanding');
});

test('a notification is one persisted request, delivered once', async (t) => {
    const { state, control: receipts } = await store(t);
    const request = { id: 'n1', task: 'Report', source: 'tasks/report.book', chat: 'Plan', by: 'Chatter', cycle: 0, at: new Date().toISOString() };
    await receipts.subscribe(request);
    await receipts.subscribe({ ...request, id: 'n2' });
    assert.equal(receipts.waiting().length, 1, 'asking twice in the same chat does not notify twice');
    const reloaded = new TaskControlStore(state);
    await reloaded.load();
    assert.equal(reloaded.waiting()[0].id, 'n1', 'it survives a restart');
    await reloaded.delivered('n1', 'is done');
    assert.equal(reloaded.waiting().length, 0);
});

test('engine: a change reaches running work by interrupting and continuing it, with receipts, and the same provider session', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '3500' };
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const working = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Slow work') && session.state === 'working' && session.providerIds.length), { message: 'the running session' });

    const outcome = await control(project, 'task-change', { task: 'Slow work', operation: 'amend', instruction: 'Also add CHANGE_MARKER_ONE to the result.', via: 'test' });
    assert.equal(outcome.applied, true, outcome.outcome);
    assert.match(outcome.outcome, /not applied yet/, 'saving and asking to stop is not application');
    const book = await bookOf(project, 'Slow work');
    assert.match(book.text, /TASK CHANGE \S+ task\nAlso add CHANGE_MARKER_ONE/, 'the amendment is appended to the Book');
    assert.ok(findGenerated(await subjects(project), 'Change task - Slow work') !== undefined || (await subjects(project)).some((subject) => subject.includes('Change task')), 'it is committed by itself');

    const continued = await waitFor(async () => (await turns(log)).find((entry) => entry.title?.startsWith('Slow work') && entry.changeMarkers?.includes('CHANGE_MARKER_ONE')), { message: 'the turn with the change' });
    assert.equal(continued.resumedThread, working.providerIds.at(-1), 'the same provider session, no competing executor');
    const done = await waitFor(async () => findGenerated(await subjects(project), 'Slow work SLOW_WORK', 'ptbk: '), { message: 'the result with the change', timeoutMs: 90_000 });
    assert.ok(done);
    const settled = await waitFor(async () => {
        const receipt = (await status(project, env)).taskControl.receipts.find((candidate) => candidate.task.startsWith('Slow work'));
        return receipt?.state === 'applied' ? receipt : undefined;
    }, { message: 'the receipt to settle' });
    assert.equal(settled.session, working.handle);
    assert.ok(settled.history.some((entry) => entry.state === 'delivered'), 'it was delivered before it was applied');
    assert.ok(settled.history.some((entry) => entry.state === 'queued'), 'it waited for the safe point before that');
    await ptbk(['stop', '--raw'], { cwd: project, env });
});

test('engine: cancelling stops work without success, keeps its Book and starts nothing; a paused change waits for Resume', { timeout: 240_000 }, async (t) => {
    const { project, directory, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const barrier = join(directory, 'partial output barrier');
    await writeFile(barrier, 'hold the turn after reporting its output\n');
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '4000', FAKE_CODEX_OUTPUT_BARRIER: barrier };
    await ptbk(['add', 'Cancelled work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const working = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Cancelled work') && session.state === 'working'), { message: 'the running session' });
    await waitFor(async () => (await status(project, env)).active?.some((unit) => unit.taskTitle.startsWith('Cancelled work') && unit.files?.some((path) => path.startsWith('output/'))), { message: 'the reported partial output' });
    const cancelled = await control(project, 'task-change', { task: 'Cancelled work', operation: 'cancel', instruction: 'I no longer want this.', via: 'test' });
    assert.match(cancelled.outcome, /has not necessarily stopped yet/, 'intent is not proof of a stop');
    // Let the already-started action reach its safe point after cancellation is accepted. Windows console shims
    // cannot always receive a polite termination signal; pausing/cancelling never force-kills such an operation.
    await rm(barrier);
    await waitFor(async () => (await status(project, env)).harnessSessions.ended.find((session) => session.handle === working.handle), { message: 'its session to end' });
    const ended = (await status(project, env)).harnessSessions.ended.find((session) => session.handle === working.handle);
    assert.match(ended.endReason, /cancelled/);
    assert.equal(findGenerated(await subjects(project), 'Cancelled work SLOW_WORK', 'ptbk: '), undefined, 'cancellation is not a result');
    const book = await bookOf(project, 'Cancelled work');
    assert.match(book.text, /TASK STATUS cancelled/);
    assert.doesNotMatch(book.text, /TASK DONE/, 'it is not called successful');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal((await turns(log)).filter((entry) => entry.title?.startsWith('Cancelled work')).length, 1, 'it never starts again');

    assert.ok((await git(project, ['status', '--porcelain', '--', 'output'])).trim(), 'cancellation keeps the partial output without calling it a result');
    assert.equal((await ptbk(['stop', '--force', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await turns(log)).filter((entry) => entry.title?.startsWith('Cancelled work')).length, 1, 'a restart does not authorize cancelled work');

    // Reopening the same work appends to the same Book.
    const reopened = await control(project, 'task-change', { task: 'Cancelled work', operation: 'reopen', instruction: 'After all, please do CHANGE_MARKER_BACK.', via: 'test' });
    assert.equal(reopened.data.reopened, true);
    const again = (await bookOf(project, 'Cancelled work')).text;
    assert.match(again, /TASK REOPEN .*\nTASK CHANGE [^\n]*\nAfter all[^\n]*\n+TASK STATUS todo/);
    assert.match(again, /TASK STATUS cancelled/, 'the cancellation stays in the history');
    await waitFor(async () => findGenerated(await subjects(project), 'Cancelled work SLOW_WORK', 'ptbk: '), { message: 'the reopened work to finish', timeoutMs: 90_000 });
    assert.equal((await git(project, ['status', '--porcelain', '--', 'output'])).trim(), '', 'reopened work commits its retained output rather than treating it as unrelated');

    // Under Pause the change is saved and its delivery waits.
    await ptbk(['add', 'Paused work', '--agent', 'Developer', '--priority', '1', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status(project, env)).service.state === 'pause', { message: 'the pause' });
    const deferred = await control(project, 'task-change', { task: 'Paused work', operation: 'amend', instruction: 'Use CHANGE_MARKER_PAUSED.', via: 'test' });
    assert.match(deferred.outcome, /waits until the engine resumes/);
    assert.equal((await status(project, env)).taskControl.receipts.find((receipt) => receipt.task.startsWith('Paused work')).state, 'deferred');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    assert.equal((await turns(log)).filter((entry) => entry.title?.startsWith('Paused work')).length, 0, 'no chat or change advances paused work');
    await ptbk(['stop', '--force', '--raw'], { cwd: project, env });
});

test('engine: a chat queries, changes and subscribes without inventing work, and is told once when it ends', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '0' };
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await status(project, env)).service.state === 'pause', { message: 'the pause' });
    await ptbk(['add', 'Weekly report', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const before = (await git(project, ['ls-files', 'tasks'])).trim().split('\n').length;

    const asked = await ptbk(['chat', 'How is it going? TASK_STATUS[Weekly report]', '--raw'], { cwd: project, env });
    assert.equal(asked.code, 0, asked.output);
    assert.match(asked.stdout, /Status result: .*Weekly report/, 'chats keep working during a pause');
    const chatName = JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout).chats?.[0]?.name ?? JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout)[0].name;
    assert.equal((await git(project, ['ls-files', 'tasks'])).trim().split('\n').length, before, 'a status question creates no task');
    assert.doesNotMatch((await bookOf(project, 'Weekly report')).text, /TASK CHANGE/, 'and changes none');

    const send = async (text) => {
        const known = (await control(project, 'chat-get', { name: chatName })).messages.length;
        await control(project, 'chat-send', { name: chatName, text, via: 'test' });
        return await waitFor(async () => {
            const { messages } = await control(project, 'chat-get', { name: chatName });
            // The message itself comes first, then the reply.
            return messages.slice(known + 1)[0]?.text;
        }, { message: `the reply to ${text}` });
    };
    assert.match(await send('Tell me when it is done. NOTIFY_TASK[Weekly report]'), /told when \{Weekly report/);
    assert.doesNotMatch((await bookOf(project, 'Weekly report')).text, /TASK CHANGE/, 'a notification changes nothing');
    assert.equal((await status(project, env)).taskControl.notifications.length, 1);

    const changed = await send('Use a table please. CHANGE_TASK[Weekly report|amend|Present the numbers as CHANGE_MARKER_TABLE.]');
    assert.match(changed, /Delivery waits until the engine resumes/, 'the agent reports what actually happened');
    const book = await bookOf(project, 'Weekly report');
    assert.match(book.text, /TASK CHANGE \S+ task \{[^\n]+\}\nPresent the numbers/, 'the Book names the source chat');
    const stored = JSON.parse(await readFile(join(project, '.ptbk', 'state', 'task-control.json'), 'utf8'));
    const record = stored.controls.at(-1);
    assert.equal(record.origin.authority, 'user');
    assert.match(record.origin.message, /Use a table please/, 'the original user message is preserved');
    assert.equal(record.instruction, 'Present the numbers as CHANGE_MARKER_TABLE.', 'next to the interpreted instruction');
    assert.match(await send('Which one? CHANGE_TASK[No such work|amend|Anything]'), /Nothing was changed: No task matches/);

    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => findGenerated(await subjects(project), 'Weekly report', 'ptbk: '), { message: 'the work to finish', timeoutMs: 90_000 });
    const told = await waitFor(async () => {
        const { messages } = await control(project, 'chat-get', { name: chatName });
        const found = messages.filter((message) => message.text.startsWith('Update on {Weekly report'));
        return found.length ? found : undefined;
    }, { message: 'the notification', timeoutMs: 60_000, intervalMs: 500 });
    assert.equal(told.length, 1);
    assert.match(told[0].text, /is done/);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const { messages: final } = await control(project, 'chat-get', { name: chatName });
    assert.equal(final.filter((message) => message.text.startsWith('Update on {Weekly report')).length, 1, 'delivered once');
    assert.equal((await status(project, env)).taskControl.notifications.length, 0);
    await ptbk(['stop', '--raw'], { cwd: project, env });
});

test('engine: reassigning moves work to the new agent after a checkpoint; one owner at a time, and an invalid target changes nothing', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '3500' };
    await writeFile(join(project, 'agents', 'reviewer.book'), 'AGENT Reviewer\n\nPERSONA Reviews the work.\n');
    await git(project, ['add', '.']);
    await git(project, ['commit', '-m', 'Add Reviewer']);
    await ptbk(['add', 'Moved work SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const first = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Moved work') && session.state === 'working' && session.providerIds.length), { message: 'the running session', timeoutMs: 60_000 });
    assert.equal(first.agent, 'Developer');

    const before = (await bookOf(project, 'Moved work')).text;
    await assert.rejects(control(project, 'task-change', { task: 'Moved work', operation: 'amend', instruction: 'Let nobody take it.', agent: 'Nobody', via: 'test' }), /No agent matches/);
    await assert.rejects(control(project, 'task-change', { task: 'Moved work', operation: 'amend', instruction: 'Only later.', agent: 'Reviewer', scope: 'future', via: 'test' }), /later occurrences/);
    assert.equal((await bookOf(project, 'Moved work')).text, before, 'a refused reassignment leaves the Book untouched');

    const outcome = await control(project, 'task-change', { task: 'Moved work', operation: 'amend', instruction: 'Reviewer takes this over.', agent: 'Reviewer', via: 'test' });
    assert.equal(outcome.applied, true, outcome.outcome);
    const book = (await bookOf(project, 'Moved work')).text;
    assert.match(book, /TASK AGENT \{?@?Developer\}?[\s\S]*TASK CHANGE \S+ task\nReviewer takes this over\.\s+TASK AGENT \{?@?Reviewer\}?/, 'the previous owner stays and the new one is appended after the change');

    const second = await waitFor(async () => (await status(project, env)).harnessSessions?.open.find((session) => session.work.kind === 'task' && session.work.task.startsWith('Moved work') && session.agent === 'Reviewer'), { message: 'the session of the new agent', timeoutMs: 60_000 });
    assert.notEqual(second.handle, first.handle, 'the context of the previous agent is not continued by the new one');
    assert.equal(second.predecessor?.handle, first.handle, 'the replacement names its predecessor');
    assert.match(second.predecessor.reason, /moved to Reviewer/);
    const taken = await waitFor(async () => (await turns(log)).find((entry) => entry.title?.startsWith('Moved work') && entry.reassigned), { message: 'the turn of the new agent', timeoutMs: 60_000 });
    assert.equal(taken.resumedThread ?? null, null, 'the new agent starts its own provider session');
    assert.equal(taken.agent, 'Reviewer', 'the turn is run by the new agent');
    assert.ok((await waitFor(async () => findGenerated(await subjects(project), 'Moved work SLOW_WORK', 'ptbk: '), { message: 'the result of the new agent', timeoutMs: 90_000 })));
    await ptbk(['stop', '--raw'], { cwd: project, env });
});

test('engine: reassigned work waits for its new agent to finish what it holds, so no agent runs two tasks', { timeout: 240_000 }, async (t) => {
    const { project, env: baseEnv, log } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '8000' };
    await writeFile(join(project, 'agents', 'reviewer.book'), 'AGENT Reviewer\nGOAL Write what the task asks for.\nMODEL harness=OPENAI_CODEX model=fake-model-1 thinking=medium\n');
    await git(project, ['add', '.']);
    await git(project, ['commit', '-m', 'Add Reviewer']);
    await ptbk(['add', 'Busy review SLOW_WORK', '--agent', 'Reviewer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Waiting move SLOW_WORK', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => {
        const open = (await status(project, env)).harnessSessions?.open.filter((session) => session.work.kind === 'task' && session.state === 'working' && session.providerIds.length) ?? [];
        return ['Busy review', 'Waiting move'].every((start) => open.some((session) => session.work.task.startsWith(start))) ? open : undefined;
    }, { message: 'both tasks to run', timeoutMs: 60_000 });

    await control(project, 'task-change', { task: 'Waiting move', operation: 'amend', instruction: 'Reviewer takes this over.', agent: 'Reviewer', via: 'test' });
    const taken = await waitFor(async () => (await turns(log)).find((entry) => entry.title?.startsWith('Waiting move') && entry.reassigned), { message: 'the turn of the new agent', timeoutMs: 90_000 });
    assert.equal(taken.agent, 'Reviewer');
    assert.ok(findGenerated(await subjects(project), 'Busy review SLOW_WORK', 'ptbk: '), 'the new agent finished the task it held before taking this one');
    await ptbk(['stop', '--force', '--raw'], { cwd: project, env });
});

test('engine: a late completion cannot race past an accepted change', { timeout: 240_000 }, async (t) => {
    // The check holds the run at its last step; a change accepted meanwhile must stop this result from being recorded.
    const { project, env: baseEnv, log, directory } = await initializedProject(t, { check: `import { existsSync, writeFileSync } from 'node:fs';
const hold = process.env.HOLD_FILE;
if (hold && !existsSync(hold + '.done')) { writeFileSync(hold, 'held'); await new Promise((resolve) => setTimeout(resolve, 2500)); writeFileSync(hold + '.done', 'done'); }
process.exit(0);
` });
    const hold = join(directory, 'hold');
    const env = { ...baseEnv, HOLD_FILE: hold, FAKE_CODEX_SLOW_MS: '0' };
    await ptbk(['add', 'Careful work', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    await waitFor(async () => (await readFile(hold, 'utf8').catch(() => '')) === 'held', { message: 'the check to hold the run' });
    assert.equal(findGenerated(await subjects(project), 'Careful work', 'ptbk: '), undefined);
    const accepted = await control(project, 'task-change', { task: 'Careful work', operation: 'amend', instruction: 'Also mention CHANGE_MARKER_LATE.', via: 'test' });
    assert.equal(accepted.applied, true);
    const continued = await waitFor(async () => (await turns(log)).find((entry) => entry.title?.startsWith('Careful work') && entry.changeMarkers?.includes('CHANGE_MARKER_LATE')), { message: 'a turn that saw the change', timeoutMs: 90_000 });
    assert.ok(continued);
    await waitFor(async () => findGenerated(await subjects(project), 'Careful work', 'ptbk: '), { message: 'the result after the change', timeoutMs: 90_000 });
    const book = await bookOf(project, 'Careful work');
    assert.ok(book.text.indexOf('TASK CHANGE') < book.text.lastIndexOf('TASK DONE'), 'the completion comes after the change, and the change survived');
    await ptbk(['stop', '--raw'], { cwd: project, env });
});
