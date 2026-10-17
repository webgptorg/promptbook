import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration, parseInterval } from '../dist/common/duration.js';
import { formatIsoWithOffset, parseDateTime } from '../dist/common/time.js';
import { readMarkdownTasks, setMarkdownControl, splitMarkdownSections } from '../dist/tasks/markdown.js';
import { parsePriority } from '../dist/tasks/priority.js';
import { recurrenceState } from '../dist/tasks/recurrence.js';
import { readTaskBook } from '../dist/tasks/book-task.js';
import { evaluateQueue, selectNext } from '../dist/tasks/eligibility.js';

test('durations: compound, ISO, words; calendar units and zero intervals are rejected', () => {
    assert.equal(parseDuration('30m').ms, 1_800_000);
    assert.equal(parseDuration('1h30m').ms, 5_400_000);
    assert.equal(parseDuration('every 2 weeks').ms, 14 * 86_400_000);
    assert.equal(parseDuration('P1W').ms, 7 * 86_400_000);
    assert.equal(parseDuration('PT1H30M').ms, 5_400_000);
    assert.equal(parseDuration('daily').ms, 86_400_000);
    assert.equal(parseDuration('0').ms, 0);
    assert.equal(parseDuration('1 month').ok, false);
    assert.equal(parseDuration('P1M').ok, false);
    assert.equal(parseInterval('0m').ok, false);
    assert.equal(parseDuration('99999999 weeks').ok, false);
    assert.equal(formatDuration(5_400_000), '1h 30m');
});

test('date/time boundaries: offsets, date-only start of day, DST gaps and overlaps', () => {
    assert.equal(parseDateTime('2026-10-30T09:00:00+01:00').epochMs, Date.parse('2026-10-30T08:00:00Z'));
    assert.equal(parseDateTime('2026-10-30 09:00Z').epochMs, Date.parse('2026-10-30T09:00:00Z'));
    assert.equal(parseDateTime('2026-10-30', 'UTC').epochMs, Date.parse('2026-10-30T00:00:00Z'));
    assert.equal(parseDateTime('2026-10-30T09:00', 'Europe/Prague').epochMs, Date.parse('2026-10-30T08:00:00Z'));
    assert.match(parseDateTime('2026-03-29T02:30', 'Europe/Prague').reason, /does not exist/);
    assert.match(parseDateTime('2026-10-25T02:30', 'Europe/Prague').reason, /ambiguous/);
    assert.equal(parseDateTime('2026-02-30').ok, false);
    assert.equal(parseDateTime('gpt-2026-01-01').ok, false);
    assert.equal(formatIsoWithOffset(Date.parse('2026-10-14T08:00:00Z'), 'Europe/Prague'), '2026-10-14T10:00:00+02:00');
});

test('textual priorities share one ordering; unknown wording stays unresolved', () => {
    assert.equal(parsePriority('3').value, 3);
    assert.equal(parsePriority('urgent').value, 10);
    assert.equal(parsePriority('high').value, 5);
    assert.equal(parsePriority('when the moon is full').resolved, false);
    assert.ok(parsePriority('-1').error);
});

test('Markdown sections: states, priority marks, selectors, time tokens and placeholders', () => {
    const source = ['[x] done 2026-10-01T10:00:00+02:00 by Developer', '', 'Finished work', '---', '[ ] !! `gpt` `2099-01-01`', '', 'Future priority work', 'Body with `2026-01-01` in description', '---', '[-]', '', 'Held', '---', 'No marker title', '---', '[^]', '', 'Interrupted', '---', '[?]', '', 'Unknown', '---', '[ ]', '', '@@@', '---', '', '```', '---', '```'].join('\n');
    const tasks = readMarkdownTasks({ source, path: '/p/prompts/a.md', relativePath: 'prompts/a.md', order: 1, timeZone: 'UTC' });
    const byTitle = Object.fromEntries(tasks.map((task) => [task.title, task]));
    assert.equal(byTitle['Finished work'].status, 'done');
    assert.deepEqual(byTitle['Finished work'].doneStamps, ['2026-10-01T10:00:00+02:00']);
    assert.equal(byTitle['Future priority work'].priority.value, 2);
    assert.deepEqual(byTitle['Future priority work'].routing.runners, ['gpt']);
    assert.equal(byTitle['Future priority work'].after, Date.parse('2099-01-01T00:00:00Z'));
    assert.equal(byTitle.Held.status, 'not-ready');
    assert.equal(byTitle['No marker title'].status, 'todo');
    assert.equal(byTitle.Interrupted.status, 'needs-recovery');
    assert.ok(byTitle.Unknown.diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    assert.equal(byTitle['@@@'].placeholder, true);
    assert.equal(splitMarkdownSections('a\n```\n---\n```\nb').length, 1);
});

test('Markdown completion attaches to the section identity, not its number', () => {
    const source = 'First\n---\n[ ]\n\nSecond task\n';
    const [, second] = readMarkdownTasks({ source, path: '/p/a.md', relativePath: 'a.md', order: 1, timeZone: 'UTC' });
    const shifted = `New first\n---\n${source}`;
    const completed = setMarkdownControl(shifted, { hash: second.source.sectionHash }, 'x', 'done 2026-10-14T10:00:00Z');
    assert.match(completed, /\[x\] done 2026-10-14T10:00:00Z\n\nSecond task/);
    assert.throws(() => setMarkdownControl('Other\n', { hash: second.source.sectionHash }, 'x', ''), /moved or disappeared/);
});

test('Markdown legacy ID comments are historical metadata only: the title is the identity, the comment is not content', () => {
    const source = 'First\n---\n<!-- ptbk-task-id: second-abc123 -->\n[-] !\n\nSecond task\n\nDetails.\n---\n[ ]\n\nThird task\n';
    const tasks = readMarkdownTasks({ source, path: '/p/a.md', relativePath: 'a.md', order: 1, timeZone: 'UTC' });
    assert.equal(tasks.length, 3);
    const second = tasks[1];
    assert.equal(second.legacyId, 'second-abc123');
    assert.equal(second.ref, '{Second task}', 'referenced by name, never by the legacy ID');
    assert.equal(second.key, 'secondtask');
    assert.equal(second.status, 'not-ready', 'the control line after the comment still decides the state');
    assert.equal(second.title, 'Second task');
    assert.equal(second.description, 'Details.');
    const completed = setMarkdownControl(source, { hash: second.source.sectionHash }, 'x', 'done 2026-10-14T10:00:00Z');
    assert.match(completed, /<!-- ptbk-task-id: second-abc123 -->\n\[x\] done 2026-10-14T10:00:00Z\n\nSecond task/, 'the historical comment is preserved, never regenerated');
    assert.equal(tasks[2].legacyId, undefined, 'no ID is generated for sections without one');
});

test('recurrence keeps anchors, coalesces downtime and never shifts slots on completion', () => {
    const day = 86_400_000;
    const anchor = Date.parse('2026-10-01T09:00:00Z');
    const task = (stamps) =>
        readTaskBook({ source: `TASK Daily\nTASK REPEAT 1d\nTASK AFTER 2026-10-01T09:00:00Z\n${stamps.map((stamp) => `TASK DONE ${stamp}`).join('\n')}`, path: '/p/t.book', relativePath: 't.book', order: 1, timeZone: 'UTC' });
    assert.deepEqual(recurrenceState(task([]), anchor - 1000, 0, 'UTC'), { kind: 'waiting', until: anchor });
    assert.equal(recurrenceState(task([]), anchor + 1000, 0, 'UTC').kind, 'due');
    const afterFirst = recurrenceState(task(['2026-10-01T09:05:00Z']), anchor + 3_600_000, 0, 'UTC');
    assert.deepEqual(afterFirst, { kind: 'waiting', until: anchor + day });
    const caughtUp = recurrenceState(task(['2026-10-01T09:05:00Z']), anchor + 7 * day + 3_600_000, 0, 'UTC');
    assert.equal(caughtUp.kind, 'due');
    assert.equal(caughtUp.slot, anchor + 7 * day);
    assert.equal(caughtUp.catchUp, true);
});

test('eligibility: priority order, future work never blocks, dependencies and cycles explained', async () => {
    const read = (name, body) => readTaskBook({ source: `${name}\nENTITY TASK\n${body}`, path: `/p/tasks/${name}.book`, relativePath: `tasks/${name}.book`, order: name.charCodeAt(0), timeZone: 'UTC' });
    const tasks = [
        read('a', 'TASK PRIORITY 1\nTASK AGENT @Developer'),
        read('b', 'TASK PRIORITY 9\nTASK AFTER 2099-01-01\nTASK AGENT @Developer'),
        read('c', 'TASK PRIORITY 5\nTASK DEPENDS ON {a}\nTASK AGENT @Developer'),
        read('d', 'TASK DEPENDS ON @e'),
        read('e', 'TASK DEPENDS ON {d}'),
        read('f', 'TASK DEPENDS ON {missing}'),
        read('g', 'TASK PRIORITY 3'),
    ];
    const evaluated = await evaluateQueue(tasks, {
        now: Date.parse('2026-10-14T00:00:00Z'),
        timeZone: 'UTC',
        awaitingUser: new Map(),
        recovery: new Map(),
        uncommittedSources: new Set(),
        activation: () => 0,
        route: async (task) => (task.routing.agent ? { kind: 'routable' } : { kind: 'needs-assignment', reason: 'No TASK AGENT yet.' }),
        assignmentFor: new Map(),
    });
    const kinds = Object.fromEntries(evaluated.map((item) => [item.task.key, item.readiness.kind]));
    assert.equal(kinds.a, 'ready');
    assert.equal(kinds.b, 'waiting-until');
    assert.equal(kinds.c, 'waiting-dependency');
    assert.equal(kinds.d, 'blocked');
    assert.equal(kinds.f, 'blocked');
    assert.equal(kinds.g, 'needs-assignment');
    assert.equal(selectNext(evaluated).task.key, 'g');
});
