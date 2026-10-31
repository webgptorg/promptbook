import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ipcAddress, ipcRequest, startIpcServer } from '../dist/common/ipc.js';
import { createStyle, terminalSafe } from '../dist/ui/ansi.js';
import { renderPanel } from '../dist/ui/panels.js';
import { FullScreen } from '../dist/ui/screen.js';
import { canShowImage, detectImageProtocol, imageSequence } from '../dist/ui/terminal-images.js';

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

const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEElEQVR4nGNgYGD4DwYMDAAcAgX7S3mMHQAAAABJRU5ErkJggg==', 'base64');
const pixelUri = `data:image/png;base64,${PIXEL_PNG.toString('base64')}`;

test('terminal images: the protocol comes from the terminal, multiplexers count as no support, and it can be set or switched off', () => {
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'iTerm.app' }), 'iterm');
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'WezTerm' }), 'iterm');
    assert.equal(detectImageProtocol({ TERM: 'xterm-kitty' }), 'kitty');
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'ghostty' }), 'kitty');
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'iTerm.app', TMUX: '/tmp/tmux-1/default,1,0' }), undefined);
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'vscode' }), undefined, 'its image support is a setting that cannot be seen from here');
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'vscode', PTBK_TERMINAL_IMAGES: 'iterm' }), 'iterm');
    assert.equal(detectImageProtocol({ TERM_PROGRAM: 'iTerm.app', PTBK_TERMINAL_IMAGES: 'off' }), undefined);
    assert.equal(detectImageProtocol({}), undefined);
});

test('terminal images: only well-formed images of a type the protocol takes are written to the terminal', () => {
    assert.equal(canShowImage(pixelUri, { images: 'iterm' }), true);
    assert.equal(canShowImage(pixelUri, { images: 'kitty' }), true);
    assert.equal(canShowImage(pixelUri, {}), false, 'no protocol: file information instead');
    assert.equal(canShowImage('data:image/jpeg;base64,AAAA', { images: 'iterm' }), true);
    assert.equal(canShowImage('data:image/jpeg;base64,AAAA', { images: 'kitty' }), false, 'kitty takes PNG directly');
    assert.equal(canShowImage('data:image/svg+xml;base64,AAAA', { images: 'iterm' }), false);
    assert.equal(canShowImage('data:image/gif;base64,AAAA', { images: 'iterm' }), true);
    assert.equal(canShowImage('data:image/gif;base64,AAAA', { images: 'iterm', reducedMotion: true }), false, 'no animation under reduced motion');
    assert.equal(canShowImage(undefined, { images: 'iterm' }), false, 'an image too large to return');

    const iterm = imageSequence(pixelUri, 'iterm', { columns: 40, rows: 10 });
    assert.match(iterm.sequence, new RegExp(`^\\x1b\\]1337;File=inline=1;size=${PIXEL_PNG.length};width=40;height=10;preserveAspectRatio=1:[A-Za-z0-9+/=]+\\x07$`));
    assert.equal(iterm.clear, undefined, 'erasing its cells removes the image');
    assert.equal(imageSequence('data:image/png;base64,AA\x1b]0;evil\x07', 'iterm', { columns: 40, rows: 10 }), undefined, 'nothing but base64 reaches the terminal');

    const small = imageSequence(pixelUri, 'kitty', { columns: 40, rows: 10 });
    assert.match(small.sequence, /^\x1b_Ga=T,f=100,q=2,C=1,c=10,r=10,m=0;[A-Za-z0-9+/=]+\x1b\\$/, 'one wide by two high fits 40x10 cells as 10x10, without an answer on stdin');
    assert.match(small.clear, /^\x1b_Ga=d,d=A,q=2\x1b\\$/);
    const tall = imageSequence(pixelUri, 'kitty', { columns: 4, rows: 40 });
    assert.match(tall.sequence, /c=4,r=4,/);
    const large = Buffer.concat([PIXEL_PNG, Buffer.alloc(9000, 1)]);
    const chunks = imageSequence(`data:image/png;base64,${large.toString('base64')}`, 'kitty', { columns: 40, rows: 10 }).sequence.split('\x1b\\').filter(Boolean);
    assert.equal(chunks.length, 3, 'the payload is sent in the protocol\'s chunks');
    assert.match(chunks[0], /m=1;/);
    assert.match(chunks[1], /^\x1b_Gm=1;/);
    assert.match(chunks[2], /^\x1b_Gm=0;/);
});

test('terminal images: an image is sent once, and again only after its area was repainted; leaving it repaints everything', () => {
    const writes = [];
    const output = { isTTY: true, columns: 80, rows: 10, write: (text) => (writes.push(text), true) };
    const screen = new FullScreen(output);
    screen.enter();
    const image = { key: 'a.png', row: 3, column: 1, rows: 5, sequence: 'IMAGE', clear: 'CLEAR' };
    const lines = ['Files', 'pixel.png', '', '', '', '', '', '', '', 'Esc back'];
    const taken = () => writes.splice(0).join('');

    screen.draw(lines, undefined, image);
    const first = taken();
    assert.match(first, /CLEAR\x1b\[4;2HIMAGE$/, 'placed over the blank area after the text');
    assert.ok(first.indexOf('Esc back') < first.indexOf('IMAGE'));

    screen.draw(lines, undefined, image);
    assert.doesNotMatch(taken(), /IMAGE/, 'a live repaint of an unchanged page does not send it again');

    screen.draw(['Files · 2 running', ...lines.slice(1)], undefined, image);
    assert.doesNotMatch(taken(), /IMAGE/, 'a change outside its area keeps it');

    screen.draw(['Files · 2 running', 'pixel.png', '', '', 'text over the image', '', '', '', '', 'Esc back'], undefined, image);
    assert.match(taken(), /IMAGE/, 'a repainted row of its area erased it');

    screen.invalidate();
    taken();
    screen.draw(lines, undefined, image);
    assert.match(taken(), /IMAGE/, 'after a resize');

    screen.draw(lines);
    const left = taken();
    assert.match(left, /CLEAR\x1b\[2J/, 'its protocol deletion and a clear screen');
    assert.match(left, /pixel\.png/, 'everything is drawn again');
    assert.doesNotMatch(left, /IMAGE/);

    screen.draw(lines, undefined, image);
    taken();
    screen.draw(lines, undefined, { ...image, key: 'b.png', sequence: 'OTHER' });
    assert.match(taken(), /CLEAR\x1b\[2J[\s\S]*OTHER$/, 'another image replaces it');
    screen.leave();
    assert.match(taken(), /^CLEAR/, 'no image is left behind');

    const full = new FullScreen({ ...output, writableNeedDrain: true, once: () => undefined, write: (text) => (writes.push(text), true) });
    full.enter();
    taken();
    full.draw(lines, undefined, image);
    assert.equal(taken(), '', 'a terminal applying back-pressure gets no image either: the newest frame waits');
});
