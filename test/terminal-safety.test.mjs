import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStyle, terminalSafe } from '../dist/ui/ansi.js';
import { renderPanel } from '../dist/ui/panels.js';
import { FullScreen } from '../dist/ui/screen.js';

test('rendered lines keep styling but untrusted names cannot retitle, move, reset or clear the terminal', () => {
    const styled = '\x1b[1mbold\x1b[22m \x1b[38;5;214mcolor\x1b[39m';
    assert.equal(terminalSafe(styled), styled, 'SGR styling is kept');
    const hostile = 'Task\x1b]0;evil\x07 A\x1b]52;c;Y2xpcA==\x1b\\B\x1b[2J\x1b[H\x1bc\x1b7\x1bPq#0\x1b\\C\r\nD\x07\x9b2JE\x1b]8;;https://x\x07';
    assert.equal(terminalSafe(hostile), 'Task ABCDE');

    const writes = [];
    const screen = new FullScreen({ isTTY: true, columns: 80, rows: 10, write: (text) => writes.push(text) });
    screen.enter();
    screen.draw(['Queue: Write the bird\x1b]0;evil\x07 README', ...renderPanel({ title: 'Chat\x1b]2;evil\x07', lines: ['x\x1b[2Jy'], width: 40, unicode: true, style: createStyle(true) })]);
    const output = writes.join('');
    assert.doesNotMatch(output, /\x1b\]/, 'no OSC (title) control reaches the terminal');
    assert.doesNotMatch(output, /evil\x07/);
    assert.match(output, /Write the bird README/);
});
