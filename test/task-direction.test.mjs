import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBook } from '../dist/book/parse.js';
import { highlightBook } from '../dist/book/highlight.js';
import { readTaskBook, taskInstructionSource } from '../dist/tasks/book-task.js';
import { evaluateQueue } from '../dist/tasks/eligibility.js';
import { recurrenceState } from '../dist/tasks/recurrence.js';
import { applicableChanges } from '../dist/tasks/task-direction.js';
import { buildTaskPrompt } from '../dist/engine/prompt.js';

/** Reads a task Book from its source lines. */
function task(...lines) {
    return readTaskBook({ source: `${lines.join('\n')}\n`, path: '/p/tasks/a.book', relativePath: 'tasks/a.book', order: 1, timeZone: 'UTC' });
}

/** Messages of a task's blocking diagnostics. */
function errors(item) {
    return item.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').map((diagnostic) => diagnostic.message);
}

/** Evaluates a task among others with no runtime facts. */
async function readiness(target, ...others) {
    const context = { now: Date.parse('2026-11-01T00:00:00Z'), timeZone: 'UTC', awaitingUser: new Map(), recovery: new Map(), uncommittedSources: new Set(), activation: () => 0, route: async () => ({ kind: 'routable' }), assignmentFor: new Map() };
    const evaluated = await evaluateQueue([target, ...others], context);
    return evaluated.find((item) => item.task.key === target.key).readiness;
}

const STAMP = '2026-10-31T20:00:00+01:00';

test('TASK CHANGE: a chronological amendment with scope, source chat and content', () => {
    const item = task('TASK Export CSV', 'GOAL Export the table.', `TASK CHANGE ${STAMP} task {Discuss CSV export}`, 'Keep the existing column order', 'and add an encoding selector.', `TASK CHANGE 2026-10-31T20:01:00+01:00 occurrence @Chat`, 'For this run only, write the sample under examples/.');
    assert.deepEqual(errors(item), []);
    assert.equal(parseBook(item.text).kind, 'task');
    assert.equal(item.title, 'Export CSV');
    assert.deepEqual(item.changes.map((change) => [change.scope, change.chat, change.at, change.text]), [
        ['task', '{Discuss CSV export}', STAMP, 'Keep the existing column order\nand add an encoding selector.'],
        ['occurrence', '@Chat', '2026-10-31T20:01:00+01:00', 'For this run only, write the sample under examples/.'],
    ]);
    assert.notEqual(item.changes[0].id, item.changes[1].id);
});

test('TASK CHANGE: invalid amendments are diagnosed and never take effect', () => {
    const cases = [
        ['2026-10-31T20:00:00 task', /explicit timezone/],
        ['2026-10-31 task', /explicit timezone/],
        ['not-a-date task', /timestamp/],
        [`${STAMP} everything`, /scope "everything"/],
        [`${STAMP} task plain words`, /source-chat reference/],
        [STAMP, /needs `<timestamp>/],
    ];
    for (const [header, expected] of cases) {
        const item = task('TASK Example', 'GOAL Work.', `TASK CHANGE ${header}`, 'Do it differently.', 'TASK AGENT @Someone');
        assert.match(errors(item).join(' '), expected, header);
        assert.deepEqual(item.changes, [], header);
        assert.equal(item.routing.agent, undefined, `typed controls under a rejected amendment stay ineffective (${header})`);
    }
    const empty = task('TASK Example', 'GOAL Work.', `TASK CHANGE ${STAMP} task`, 'TASK PRIORITY 3');
    assert.match(errors(empty).join(' '), /has no content/);
    assert.deepEqual(empty.changes, []);
});

test('typed controls: the last valid applicable value is effective, retaining earlier layers', () => {
    const item = task('TASK Example', 'GOAL Work.', 'TASK AGENT @First', 'TASK PRIORITY 1', 'TASK AFTER 2026-11-01', 'TASK DUE DATE 2026-12-01', `TASK CHANGE ${STAMP} task`, 'Reassign and hurry.', 'TASK AGENT @Second', 'TASK PRIORITY 5', 'TASK AFTER 2026-11-02', 'TASK DUE DATE 2026-11-20');
    assert.deepEqual(errors(item), []);
    assert.equal(item.routing.agent, '@Second');
    assert.equal(item.priority.value, 5);
    assert.equal(item.after, Date.parse('2026-11-02T00:00:00Z'));
    assert.equal(item.due, '2026-11-20');
    assert.match(item.text, /TASK AGENT @First/);
});

test('typed controls: distinct values with no change between them stay a conflict; an invalid later value keeps the earlier one', () => {
    const conflict = task('TASK Example', 'GOAL Work.', 'TASK AGENT @First', 'TASK AGENT @Second');
    assert.match(errors(conflict).join(' '), /conflicting values/);
    const sameLayer = task('TASK Example', 'GOAL Work.', `TASK CHANGE ${STAMP} task`, 'Change.', 'TASK PRIORITY 1', 'TASK PRIORITY 2');
    assert.match(errors(sameLayer).join(' '), /conflicting values/);
    const invalid = task('TASK Example', 'GOAL Work.', 'TASK AFTER 2026-11-01', `TASK CHANGE ${STAMP} task`, 'Move it.', 'TASK AFTER nonsense');
    assert.match(errors(invalid).join(' '), /TASK AFTER/);
    assert.equal(invalid.after, Date.parse('2026-11-01T00:00:00Z'));
    const repaired = task('TASK Example', 'GOAL Work.', `TASK CHANGE ${STAMP} task`, 'Move it.', 'TASK AFTER nonsense', `TASK CHANGE ${STAMP} task`, 'Repair it.', 'TASK AFTER 2026-11-03');
    assert.deepEqual(errors(repaired), []);
    assert.ok(repaired.diagnostics.some((diagnostic) => diagnostic.severity === 'warning' && /TASK AFTER/.test(diagnostic.message)));
    assert.equal(repaired.after, Date.parse('2026-11-03T00:00:00Z'));
});

test('TASK STATUS: repeated transitions, the last valid one is effective', () => {
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS not-ready', 'TASK STATUS todo').status, 'todo');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS todo', 'TASK STATUS failed').status, 'failed');
    const repaired = task('TASK Example', 'GOAL W.', 'TASK STATUS bogus', 'TASK STATUS not-ready');
    assert.deepEqual(errors(repaired), []);
    assert.equal(repaired.status, 'not-ready');
    const invalid = task('TASK Example', 'GOAL W.', 'TASK STATUS bogus');
    assert.match(errors(invalid).join(' '), /cancelled/);
    assert.equal(invalid.status, 'not-ready');
});

test('one-off cycles: source order of DONE, REOPEN and cancellation decides completion', async () => {
    const done = task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`);
    assert.equal(done.status, 'done');
    assert.equal((await readiness(done)).kind, 'done');
    const todoAlone = task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, 'TASK STATUS todo');
    assert.equal(todoAlone.status, 'done', '`todo` alone cannot negate a DONE');
    const reopened = task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, `TASK REOPEN 2026-11-01T10:00:00+01:00 {Some chat}`);
    assert.deepEqual(errors(reopened), []);
    assert.equal(reopened.status, 'todo');
    assert.equal(reopened.reopened, true);
    assert.equal(reopened.doneStamps.length, 1, 'the earlier DONE stays history');
    assert.equal((await readiness(reopened)).kind, 'ready');
    const doneAgain = task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, 'TASK REOPEN 2026-11-01T10:00:00+01:00', 'TASK DONE 2026-11-01T11:00:00+01:00');
    assert.equal(doneAgain.status, 'done');
    assert.equal(doneAgain.reopened, false);
    assert.equal(doneAgain.doneStamps.length, 2);
    // Source order decides, even when the wall-clock stamps disagree.
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK DONE 2027-01-01T00:00:00Z', 'TASK REOPEN 2026-01-01T00:00:00Z').status, 'todo');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK REOPEN 2027-01-01T00:00:00Z', 'TASK DONE 2026-01-01T00:00:00Z').status, 'done');
    // A later REOPEN follows even a historical unknown completion.
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK DONE unknown', `TASK REOPEN ${STAMP}`).status, 'todo');
    const invalid = task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, 'TASK REOPEN yesterday');
    assert.match(errors(invalid).join(' '), /TASK REOPEN/);
    assert.equal(invalid.status, 'done', 'an invalid reopening does not reopen');
    assert.equal(task('TASK Example', 'GOAL W.', `TASK REOPEN ${STAMP}`).reopened, false, 'reopening open work is a no-op');
});

test('cancellation closes one-off work without success; todo needs REOPEN and REOPEN keeps the status', async () => {
    const cancelled = task('TASK Example', 'GOAL W.', 'TASK STATUS cancelled');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal((await readiness(cancelled)).kind, 'cancelled');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS cancelled', 'TASK STATUS todo').status, 'cancelled', '`todo` alone cannot erase the closed cycle');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS cancelled', `TASK REOPEN ${STAMP}`).status, 'cancelled', 'REOPEN does not silently remove the status');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS cancelled', `TASK REOPEN ${STAMP}`, 'TASK STATUS todo').status, 'todo');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS not-ready', `TASK DONE ${STAMP}`, `TASK REOPEN ${STAMP}`).status, 'not-ready', 'a retained status survives REOPEN');
    assert.equal(task('TASK Example', 'GOAL W.', 'TASK STATUS failed', `TASK DONE ${STAMP}`).status, 'done', 'a stale status cannot erase a later success');
    assert.equal(task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, 'TASK STATUS failed').status, 'failed');
});

test('dependencies: failed or cancelled work does not satisfy them; a reopened prerequisite makes the dependant wait again', async () => {
    const dependant = readTaskBook({ source: 'TASK Dependant\nGOAL W.\nTASK DEPENDS ON {Example}\n', path: '/p/tasks/b.book', relativePath: 'tasks/b.book', order: 2, timeZone: 'UTC' });
    assert.equal((await readiness(dependant, task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`))).kind, 'ready');
    const cancelled = await readiness(dependant, task('TASK Example', 'GOAL W.', 'TASK STATUS cancelled'));
    assert.equal(cancelled.kind, 'waiting-dependency');
    assert.match(cancelled.reason, /cancelled/);
    assert.equal((await readiness(dependant, task('TASK Example', 'GOAL W.', `TASK DONE ${STAMP}`, `TASK REOPEN ${STAMP}`))).kind, 'waiting-dependency');
});

test('recurring work: occurrence, future and task scopes of schedule and status', async () => {
    const hour = 3_600_000;
    const anchor = Date.parse('2026-11-01T00:00:00Z');
    const base = ['TASK Recurring report', 'GOAL W.', 'TASK REPEAT 1h', 'TASK AFTER 2026-11-01T00:00:00Z'];
    const changed = task(...base, `TASK CHANGE 2026-11-01T01:00:00Z future`, 'Report every two hours.', 'TASK REPEAT 2h');
    assert.deepEqual(errors(changed), []);
    assert.equal(changed.repeatMs, 2 * hour);
    const retired = task(...base, `TASK CHANGE 2026-11-01T01:00:00Z future`, 'Stop the reports after today.', 'TASK STATUS retired');
    assert.equal(retired.status, 'retired');
    assert.equal(retired.statusScope, 'future');
    assert.equal(task(...base, 'TASK STATUS retired', 'TASK STATUS todo').status, 'todo', '`todo` reactivates a retained definition');
    // Cancelling one occurrence closes only that run: the schedule continues with the next slot.
    const oneRun = task(...base, 'TASK CHANGE 2026-11-01T00:30:00Z occurrence', 'Skip this run.', 'TASK STATUS cancelled');
    assert.equal(oneRun.status, 'todo');
    assert.deepEqual(recurrenceState(oneRun, anchor + 45 * 60_000, anchor, 'UTC'), { kind: 'waiting', until: anchor + hour });
    // An occurrence amendment expires with its occurrence.
    const expired = task(...base, 'TASK CHANGE 2026-11-01T00:30:00Z occurrence', 'Run it differently once.', 'TASK PRIORITY 9', 'TASK DONE 2026-11-01T00:40:00Z');
    assert.equal(expired.priority.value, 0);
    assert.deepEqual(applicableChanges(expired), []);
    // Reopening one occurrence needs its provenance; it reuses the slot instead of adding a run.
    const reopened = task(...base, 'TASK DONE 2026-11-01T00:40:00Z', 'TASK CHANGE 2026-11-01T00:50:00Z occurrence', 'Redo it.', 'TASK REOPEN 2026-11-01T00:50:00Z');
    assert.equal(reopened.reopenedOccurrence, true);
    assert.deepEqual(recurrenceState(reopened, anchor + 50 * 60_000, anchor, 'UTC'), { kind: 'due', slot: anchor, catchUp: false });
    const finished = task(...base, 'TASK DONE 2026-11-01T00:40:00Z', 'TASK CHANGE 2026-11-01T00:50:00Z occurrence', 'Redo it.', 'TASK REOPEN 2026-11-01T00:50:00Z', 'TASK DONE 2026-11-01T00:55:00Z');
    assert.equal(finished.reopenedOccurrence, undefined);
    assert.equal(recurrenceState(finished, anchor + 56 * 60_000, anchor, 'UTC').kind, 'waiting');
    const withoutProvenance = task(...base, 'TASK DONE 2026-11-01T00:40:00Z', 'TASK REOPEN 2026-11-01T00:50:00Z');
    assert.equal(withoutProvenance.reopenedOccurrence, undefined);
    assert.ok(withoutProvenance.diagnostics.some((diagnostic) => /occurrence-scoped/.test(diagnostic.message)));
});

test('amendments reach the prompt by scope; literal history stays out of the instructions', () => {
    const item = task('TASK Example', 'GOAL Write the report.', 'TASK NOTE An explanation, not a change.', `TASK DONE ${STAMP}`, 'TASK CHANGE 2026-11-01T10:00:00+01:00 occurrence', 'Old run only.', 'TASK CHANGE 2026-11-01T11:00:00+01:00 task {Discuss}', 'Keep the columns.', 'TASK REOPEN 2026-11-01T11:00:00+01:00', 'TASK CHANGE 2026-11-01T12:00:00+01:00 occurrence', 'This run: write under examples/.', 'TASK CHANGE 2026-11-01T13:00:00+01:00 future', 'From the next run: use French.');
    assert.equal(item.reopened, true);
    assert.doesNotMatch(taskInstructionSource(item), /TASK (DONE|CHANGE|REOPEN)|Keep the columns/);
    const agent = { name: 'Writer', instructions: [], team: [], model: { rows: [], explicit: false } };
    const prompt = (runStartedAt) => buildTaskPrompt({ agent, task: item, projectRoot: '/p', tasksDirectory: 'tasks', tools: { team: false, askUser: false, browser: false }, attempt: 1, runStartedAt });
    const running = prompt(Date.parse('2026-11-01T11:30:00+01:00'));
    assert.match(running, /## Changes to this task/);
    assert.match(running, /Keep the columns\./);
    assert.match(running, /This run: write under examples\//);
    assert.match(running, /from the chat \{Discuss\}/);
    assert.match(running, /Old run only\./, 'written in the same cycle, it still applies');
    assert.doesNotMatch(running, /use French/, 'a future amendment stays out of the run it was written during');
    assert.match(running, /## Reopened work/);
    assert.match(prompt(Date.parse('2026-11-01T14:00:00+01:00')), /use French/, 'a run that begins later receives it');
});

test('TASK CHANGE and TASK REOPEN share the common vocabulary and highlighting', () => {
    const source = `TASK Example\nGOAL Work.\nTASK CHANGE ${STAMP} task {Chat}\nChange it.\nTASK REOPEN ${STAMP}\n`;
    const document = parseBook(source);
    assert.deepEqual(document.diagnostics.filter((diagnostic) => /Unknown/.test(diagnostic.message)), []);
    assert.deepEqual(document.commitments.map((commitment) => commitment.keyword), ['GOAL', 'TASK CHANGE', 'TASK REOPEN']);
    assert.ok(highlightBook(source).some((span) => span.kind === 'keyword' && span.line === 2 && span.end === 'TASK CHANGE'.length));
});
