import assert from 'node:assert/strict';
import test from 'node:test';
import { presentationFor, renderDocument, renderPanel, terminalWidth } from '../dist/coder/presentation.js';

test('rich summaries retain aligned information without requiring colors on narrow terminals', () => {
    const view = { pretty: true, color: false, width: 28 };
    const text = renderPanel('Promptbook 1.2.3 · Status', [['Project', '/project with spaces'], ['Status', 'waiting'], ['Task', '修复 😀 e\u0301 boundary']], view, { next: ['ptbk dashboard --path /project'] });
    assert.match(text, /┌/);
    assert.match(text, /waiting/);
    assert.match(text, /修复 😀 e\u0301/);
    assert.doesNotMatch(text, /\u001b/);
    for (const line of text.trimEnd().split('\n')) assert(terminalWidth(line) <= 27, line);
});

test('raw output has no panels or terminal sequences and keeps every result and next action', () => {
    const text = renderPanel('Promptbook 1.2.3', [['Project', '/project'], ['Status', '\u001b[32mrunning\u001b[0m']], { pretty: false, color: true, width: 80 }, { details: ['An observed outcome.'], next: ['ptbk dashboard'] });
    assert.match(text, /Status: running/);
    assert.match(text, /Next: ptbk dashboard/);
    assert.doesNotMatch(text, /[┌┐│─]|\u001b/);
});

test('document wrapping preserves complete command words and falls back for long tokens', () => {
    const text = renderDocument('Promptbook', [{ title: 'Options', lines: ['--foreground explicitly owns this execution', '--an-exceptionally-long-option'] }], { pretty: false, color: false, width: 24 });
    assert.match(text, /--foreground explicitly\nowns this execution/);
    assert.equal(text.replace(/\n/g, '').includes('--an-exceptionally-long-option'), true);
});

test('presentation never adds rich output on redirected or explicitly raw surfaces', () => {
    assert.equal(presentationFor({ isTTY: false, columns: 80 }).pretty, false);
    assert.equal(presentationFor({ isTTY: true, columns: 80 }, true).pretty, false);
});
