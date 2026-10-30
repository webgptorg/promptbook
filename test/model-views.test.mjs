import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBook } from '../dist/book/parse.js';
import { UNCONSTRAINED, constraintAllows, describeModel, determinedRow, formatModelContent, intersectModels, isImpossible, modelOfDocument, parseModelRow } from '../dist/book/model.js';
import { describeTaskFilter, filterTasks, isTaskFilterActive, smartTaskOrder, sortTasks, taskFilterChoices } from '../dist/tasks/views.js';
import { RichInput } from '../dist/ui/rich-input.js';

/** Every harness has a thinking control in these checks. */
const withThinking = () => true;

test('MODEL: one line is one conjunctive alternative, lines are alternatives, and problems are reported with their line', () => {
    const agent = parseBook('AGENT Developer\nMODEL harness=openai-codex model=* thinking=High\n    harness=CLAUDE_CODE runtime=https://proxy.example/v1/\nPERSONA Builds.');
    const parsed = modelOfDocument(agent);
    assert.deepEqual(parsed.diagnostics, []);
    assert.equal(formatModelContent(parsed.constraint), 'harness=OPENAI_CODEX thinking=high\nharness=CLAUDE_CODE runtime=https://proxy.example/v1');
    assert.deepEqual(parseModelRow('*'), { row: {}, problems: [] });
    for (const invalid of ['gpt-5', 'colour=red', 'harness=nonsense', 'thinking=extreme', 'runtime=ftp://x', 'runtime=https://user:secret@host/v1', 'model=a model=b']) {
        assert.ok(parseModelRow(invalid).problems.length, invalid);
    }
    const prose = parseModelRow('Use Claude Opus 5.5 or a newer Opus model through the configured Claude Code tool.');
    assert.equal(prose.problems.length, 1, 'a sentence is one problem, not one per word');
    assert.match(prose.problems[0], /^"Use Claude Opus 5\.5 .*…" is prose, not field=value pairs \(.*RULE\)$/);
    assert.deepEqual(parseModelRow('harness=OPENAI_CODEX and newer').problems, ['"and", "newer" are not field=value pairs'], 'stray words of one line are one problem');
    assert.deepEqual(parseModelRow('gpt-5').problems, ['"gpt-5" is not a field=value pair (for example model=gpt-5)']);
    const broken = modelOfDocument(parseBook('AGENT Developer\nPERSONA Builds.\nMODEL harness=OPENAI_CODEX colour=red'));
    assert.equal(broken.diagnostics[0].line, 3, 'the problem names its Book line');
    assert.equal(broken.constraint, UNCONSTRAINED, 'problematic content never becomes a guessed selection');
    assert.ok(modelOfDocument(parseBook('AGENT Twice\nMODEL model=a\nMODEL model=b')).diagnostics.some((diagnostic) => diagnostic.severity === 'error'), 'several MODEL commitments are an error');
    assert.equal(formatModelContent(modelOfDocument(parseBook('CHAT Talk\nCHAT MEMBER @User\nMODEL model=a\nMODEL model=b'), { multiple: 'last' }).constraint), 'model=b', 'a chat uses its latest MODEL');
});

test('MODEL: intersection keeps both sides’ restrictions, contradictions are impossible and a concrete row is determined', () => {
    const parent = { rows: [{ harness: 'OPENAI_CODEX' }, { harness: 'CLAUDE_CODE' }], explicit: true };
    const child = { rows: [{ thinking: 'high', runtime: 'default' }], explicit: true };
    const both = intersectModels(parent, child);
    assert.equal(formatModelContent(both), 'harness=OPENAI_CODEX thinking=high runtime=default\nharness=CLAUDE_CODE thinking=high runtime=default');
    assert.equal(formatModelContent(intersectModels({ rows: [{ runtime: 'default' }], explicit: true }, { rows: [{ runtime: 'local' }], explicit: true })), 'runtime=local', 'runtime=default defers to a stated endpoint');
    assert.ok(isImpossible(intersectModels({ rows: [{ harness: 'OPENAI_CODEX' }], explicit: true }, { rows: [{ harness: 'GEMINI' }], explicit: true })));
    assert.equal(describeModel(UNCONSTRAINED), 'any model');
    assert.equal(determinedRow(both, withThinking), undefined, 'alternatives and wildcards are not a determined execution');
    const concrete = { rows: [{ harness: 'OPENAI_CODEX', model: 'gpt-5-codex', thinking: 'medium', runtime: 'official' }], explicit: true };
    assert.deepEqual(determinedRow(concrete, withThinking), concrete.rows[0]);
    assert.equal(determinedRow({ rows: [{ ...concrete.rows[0], runtime: 'default' }], explicit: true }, withThinking), undefined, 'runtime=default is not concrete');
    assert.ok(determinedRow({ rows: [{ harness: 'GEMINI', model: 'gemini-2.5-pro', runtime: 'official' }], explicit: true }, () => false), 'a harness without thinking control needs no thinking level');
    const candidate = { harness: 'OPENAI_CODEX', model: 'gpt-5-codex', thinking: 'medium', runtime: 'official' };
    assert.ok(constraintAllows({ rows: [{ harness: 'OPENAI_CODEX', runtime: 'default' }], explicit: true }, candidate));
    assert.ok(!constraintAllows({ rows: [{ provider: 'OpenAI' }], explicit: true }, candidate), 'unknown provider metadata never satisfies a restriction');
    assert.ok(constraintAllows({ rows: [{ provider: 'openai' }], explicit: true }, { ...candidate, provider: 'OpenAI' }));
});

test('task views: the smart order puts current decisions first, then coming work, recent results, distant future and old history', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    const day = 24 * 3_600_000;
    const item = (title, readiness, extra = {}) => ({ ref: `{${title}}`, title, readiness, reason: '', priority: 0, doneCount: 0, source: `tasks/${title}.book`, ...extra });
    const items = [
        item('Old done', 'done', { lastDone: new Date(now - 40 * day).toISOString(), doneCount: 1 }),
        item('Far future', 'waiting-until', { until: new Date(now + 60 * day).toISOString() }),
        item('Recent done', 'done', { lastDone: new Date(now - day).toISOString(), doneCount: 1 }),
        item('Tomorrow', 'waiting-until', { until: new Date(now + day).toISOString() }),
        item('Weekly digest', 'waiting-until', { until: new Date(now + 2 * day).toISOString(), repeat: '1 week' }),
        item('Ready low', 'ready', { priority: 1 }),
        item('Running', 'active'),
        item('Ready high', 'ready', { priority: 5 }),
    ];
    assert.deepEqual(
        smartTaskOrder(items, now).map((entry) => entry.title),
        ['Running', 'Ready high', 'Ready low', 'Weekly digest', 'Tomorrow', 'Recent done', 'Far future', 'Old done'],
    );
    assert.deepEqual(sortTasks(items, 'name', false, now).map((entry) => entry.title).slice(0, 2), ['Far future', 'Old done']);
    assert.equal(sortTasks(items, 'priority', true, now)[0].title, 'Ready high', 'descending reverses the chosen field');
    assert.equal(items[0].title, 'Old done', 'sorting is a presentation and never reorders the inventory itself');
});

test('task views: user-selected filters by status, agent, kind and text never hide a task once cleared', () => {
    const item = (title, readiness, extra = {}) => ({ ref: `{${title}}`, title, readiness, reason: '', priority: 0, doneCount: 0, source: `tasks/${title}.book`, ...extra });
    const items = [
        item('Write docs', 'ready', { agent: '@Developer' }),
        item('Old report', 'done', { agent: '{Writer}', lastDone: '2025-01-01T00:00:00Z', doneCount: 1 }),
        item('Ship release', 'waiting-until', { agent: 'Developer', until: '2099-01-01T00:00:00Z', reason: 'Not before the release date' }),
        item('Update the engine 0.1.0 → 0.2.0', 'waiting-until', { kind: 'system', source: '', executor: 'the engine' }),
    ];
    assert.deepEqual(filterTasks(items, { agent: 'developer' }).map((entry) => entry.title), ['Write docs', 'Ship release'], '@Name, {Name} and Name are the same agent');
    assert.deepEqual(filterTasks(items, { readiness: 'waiting-until', kind: 'ordinary' }).map((entry) => entry.title), ['Ship release'], 'every given field must match');
    assert.deepEqual(filterTasks(items, { kind: 'system' }).map((entry) => entry.title), ['Update the engine 0.1.0 → 0.2.0']);
    assert.deepEqual(filterTasks(items, { text: 'RELEASE DATE' }).map((entry) => entry.title), ['Ship release'], 'text matches the status reason case-insensitively');
    assert.equal(filterTasks(items, {}).length, items.length, 'an empty filter keeps the complete inventory, completed history included');
    assert.equal(isTaskFilterActive({ text: '  ' }), false);
    assert.equal(describeTaskFilter({ readiness: 'done', agent: 'Writer' }), 'status done, agent Writer');
    assert.deepEqual(taskFilterChoices(items), { readiness: ['done', 'ready', 'waiting-until'], agents: ['@Developer', '{Writer}'], kinds: ['ordinary', 'system'] });
});

test('rich input: one implementation with flow and source policies (Enter submits or inserts a line, Ctrl+S saves)', async () => {
    const key = (name, extra = {}) => ({ type: 'key', name, ...extra });
    const flow = new RichInput({ mode: 'flow', refresh: () => {} });
    flow.handle({ type: 'paste', text: 'line one\nline two' });
    assert.equal(flow.segments()[0].text, 'line one\nline two', 'a paste never submits');
    flow.handle(key('newline'));
    assert.equal(flow.handle(key('enter')), 'submit');
    assert.ok(flow.keys().includes('Shift+Enter/Ctrl+J newline'));
    const source = new RichInput({ mode: 'source', literal: true, initial: 'AGENT Developer\n\tPERSONA Builds.', refresh: () => {} });
    assert.equal(source.handle(key('enter')), 'changed', 'Enter edits the source instead of saving or leaving');
    assert.equal(source.handle(key('s', { ctrl: true })), 'save');
    assert.equal(source.handle(key('escape')), 'cancel');
    assert.equal(source.segments().map((segment) => segment.text).join(''), 'AGENT Developer\n\tPERSONA Builds.\n', 'a line was inserted at the cursor and tabs stay literal');
    const { KeyParser } = await import('../dist/ui/keys.js');
    assert.deepEqual(new KeyParser().parse('\x1b[118;9u'), [{ type: 'key', name: 'v', ctrl: true }], 'macOS Command+V reported as a CSI-u chord enters the shared rich paste');
    assert.deepEqual(new KeyParser().parse('\x1b[118;5u'), [{ type: 'key', name: 'v', ctrl: true }], 'Ctrl+V reported as a CSI-u chord as well');
    assert.deepEqual(new KeyParser().parse('\x1b[118;3u'), [], 'Alt+V is not a paste');
    assert.deepEqual(new KeyParser().parse('\x1b[200~native text\x1b[201~'), [{ type: 'paste', text: 'native text' }], 'native Command+V text arrives as an ordinary paste');
    let reads = 0;
    const rich = new RichInput({ mode: 'flow', attachments: true, env: { PATH: '' }, refresh: () => reads++ });
    assert.equal(rich.handle({ type: 'paste', text: '' }), 'changed', 'an empty native paste looks for an image or document in the clipboard');
    assert.equal(rich.segments().length, 0, 'nothing is inserted before the clipboard was read');
    const long = new RichInput({ mode: 'flow', refresh: () => {} });
    long.handle({ type: 'paste', text: `${'x'.repeat(12_399)}\n` });
    assert.match(long.status(200)?.text ?? '', /\[Pasted text #1, 12,400 characters/, 'a long paste is a compact, inspectable token');
});
