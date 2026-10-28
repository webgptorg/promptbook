import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ipcAddress, ipcRequest, startIpcServer } from '../dist/common/ipc.js';
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

test('a viewer that leaves cancels its pending long poll instead of waiting for the next update', async () => {
    const server = await startIpcServer(ipcAddress(`title-${process.pid}-${Date.now()}`), () => new Promise(() => undefined));
    try {
        const controller = new AbortController();
        const started = Date.now();
        const pending = ipcRequest(server.address, { method: 'watch' }, 20_000, controller.signal);
        setTimeout(() => controller.abort(), 100);
        await assert.rejects(pending, /cancelled/);
        assert.ok(Date.now() - started < 5000, 'returned promptly');
        await assert.rejects(ipcRequest(server.address, { method: 'watch' }, 20_000, AbortSignal.abort()), /cancelled/, 'an already cancelled request does not wait');
    } finally {
        await server.close();
    }
});

test('a hidden or slow terminal gets the latest frame after it drains, never a backlog of obsolete screens', async () => {
    const { EventEmitter } = await import('node:events');
    const writes = [];
    const output = Object.assign(new EventEmitter(), { isTTY: true, columns: 60, rows: 8, writableNeedDrain: false, write: (text) => (writes.push(text), !output.writableNeedDrain) });
    const screen = new FullScreen(output);
    screen.enter();
    screen.draw(['frame 0']);
    output.writableNeedDrain = true;
    const before = writes.length;
    for (let index = 1; index <= 500; index++) screen.draw([`frame ${index}`, 'x'.repeat(index % 50)]);
    assert.equal(writes.length, before, 'nothing is queued while the terminal refuses output');
    output.columns = 40;
    output.rows = 6;
    output.writableNeedDrain = false;
    output.emit('drain');
    assert.equal(writes.length, before + 1, 'one write after the drain');
    assert.match(writes.at(-1), /frame 500/, 'the newest frame, not a replay');
    assert.doesNotMatch(writes.at(-1), /frame 499/);
    assert.equal(output.listenerCount('drain'), 0, 'no listener accumulates');
    screen.draw(['frame 501']);
    assert.match(writes.at(-1), /frame 501/, 'rendering continues normally');
});
