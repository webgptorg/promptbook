import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBook, singleValue } from '../dist/book/parse.js';
import { appendCommitment, setControlCommitment } from '../dist/book/edit.js';
import { findAgentReferences, normalizeAgentName, nonAgentOf, parseReferenceValue } from '../dist/book/references.js';
import { readTaskBook } from '../dist/tasks/book-task.js';

test('agent-name-first and TASK-title-first Books are distinct document kinds', () => {
    assert.equal(parseBook('\n\nDeveloper\n\nGOAL Ship it.').kind, 'agent');
    assert.equal(parseBook('Developer').name, 'Developer');
    const task = parseBook('TASK Improve CSV export\n\nPreserve columns.\nTASK AGENT @Developer');
    assert.equal(task.kind, 'task');
    assert.equal(task.name, 'Improve CSV export');
    assert.equal(task.intro, 'Preserve columns.');
    assert.equal(parseBook('TASK   ').kind, 'invalid');
    assert.equal(parseBook('TASK DONE 2026-01-01').kind, 'invalid');
});

test('complete keywords only: TASK AGENT is not a TASK declaration and lowercase prose is not a commitment', () => {
    const document = parseBook('TASK Title\nTASK AGENT @Developer\ntask agent is prose\nRULE first\n  continues\nRULES second');
    assert.deepEqual(
        document.commitments.map((commitment) => commitment.keyword),
        ['TASK AGENT', 'RULE', 'RULE'],
    );
    assert.equal(document.commitments[0].value, '@Developer');
    assert.equal(document.commitments[1].body, 'first\n  continues');
});

test('fenced literal content never becomes commitments', () => {
    const document = parseBook('Writer\n\nSAMPLE Example:\n```book\nTASK Not a task\nRULE not a rule\n```\nRULE real rule');
    assert.deepEqual(
        document.commitments.map((commitment) => commitment.keyword),
        ['SAMPLE', 'RULE'],
    );
    assert.match(document.commitments[0].body, /RULE not a rule/);
});

test('single-value controls report conflicts', () => {
    const document = parseBook('TASK T\nTASK AGENT @A\nTASK AGENT @B');
    const result = singleValue(document, 'TASK AGENT');
    assert.ok(result.conflict);
});

test('edits preserve prose and append completion stamps', () => {
    const source = 'TASK Title\n\nKeep this text.\n\nRULE Stay.\n';
    const routed = setControlCommitment(source, 'TASK AGENT', '@Developer');
    assert.match(routed, /Keep this text\./);
    assert.match(routed, /RULE Stay\.\nTASK AGENT @Developer\n$/);
    const replaced = setControlCommitment(routed, 'TASK AGENT', '@Planner');
    assert.equal((replaced.match(/TASK AGENT/g) ?? []).length, 1);
    assert.match(appendCommitment(replaced, 'TASK DONE', '2026-10-14T10:00:00+02:00'), /TASK DONE 2026-10-14T10:00:00\+02:00\n$/);
});

test('every documented Frontend Developer spelling normalizes identically', () => {
    const spellings = ['{Frontend Developer}', '{FrontendDeveloper}', '{frontend     Developer}', '{Frontend_Developer}', '{-Fronténd Developer}', '@FrontendDeveloper'];
    const keys = spellings.map((spelling) => parseReferenceValue(spelling).normalized);
    assert.deepEqual(new Set(keys), new Set(['frontenddeveloper']));
    assert.equal(normalizeAgentName('Frontend Developer'), 'frontenddeveloper');
    assert.equal(parseReferenceValue('@Adam').normalized, parseReferenceValue('{Adam}').normalized);
});

test('references in prose: braces and @tokens, but not e-mails or code', () => {
    const found = findAgentReferences('Ask @Lawyer, {Frontend Developer} or @User. Mail me@example.com. `@NotInCode`\n```\n@NotInFence\n```');
    assert.deepEqual(
        found.map((reference) => reference.normalized),
        ['lawyer', 'frontenddeveloper', 'user'],
    );
});

test('non-agents: Void/Null/0, User and Expert are reserved', () => {
    assert.equal(nonAgentOf('void'), 'Void');
    assert.equal(nonAgentOf('null'), 'Void');
    assert.equal(nonAgentOf('0'), 'Void');
    assert.equal(nonAgentOf('user'), 'User');
    assert.equal(nonAgentOf('expert'), 'Expert');
    assert.equal(nonAgentOf('adam'), undefined);
});

test('task Books: controls, malformed controls block, done stamps complete one-time tasks', () => {
    const read = (source) => readTaskBook({ source, path: '/p/tasks/t.book', relativePath: 'tasks/t.book', order: 1, timeZone: 'UTC' });
    const task = read('TASK Export\n\nDo it.\n\nTASK ID export-1\nTASK AGENT @Developer\nTASK PRIORITY high\nTASK AFTER 2026-10-30T09:00:00+01:00\nTASK DEPENDS ON #a, #b\nRULE Keep API.');
    assert.equal(task.ref, '#export-1');
    assert.equal(task.priority.value, 5);
    assert.equal(task.after, Date.parse('2026-10-30T08:00:00Z'));
    assert.deepEqual(task.dependsOn, ['#a', '#b']);
    assert.deepEqual(task.rules, ['Keep API.']);
    assert.equal(task.status, 'todo');
    assert.equal(read('TASK X\nTASK DONE 2026-10-14T10:00:00+02:00').status, 'done');
    assert.equal(read('TASK X\nTASK REPEAT 7d\nTASK DONE 2026-10-14T10:00:00+02:00').status, 'todo');
    assert.ok(read('TASK X\nTASK FLAVOR spicy').diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    assert.ok(read('TASK X\nTASK STATUS maybe').diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    assert.ok(read('TASK X\nTASK AFTER someday').diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    assert.ok(read('TASK X\nTASK REPEAT 1 month').diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    assert.equal(read('TASK @@@ placeholder').placeholder, true);
    assert.equal(read('Developer'), undefined);
});
