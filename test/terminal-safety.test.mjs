import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ipcAddress, ipcRequest, startIpcServer } from '../dist/common/ipc.js';
import { createStyle, terminalSafe } from '../dist/ui/ansi.js';
import { TextEditor } from '../dist/ui/composer.js';
import { KeyParser, KeyboardSession, allowsPointer } from '../dist/ui/keys.js';
import { renderPanel } from '../dist/ui/panels.js';
import { RichInput } from '../dist/ui/rich-input.js';
import { FullScreen, InlineRenderer } from '../dist/ui/screen.js';
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

test('pointer reports become events and can never arrive as typed text', () => {
    const parser = new KeyParser();
    assert.deepEqual(parser.parse('\x1b[<0;12;5M'), [{ type: 'pointer', action: 'press', row: 4, column: 11 }]);
    assert.deepEqual(parser.parse('\x1b[<4;2;3M'), [{ type: 'pointer', action: 'press', row: 2, column: 1 }], 'with a modifier');
    assert.deepEqual(parser.parse('\x1b[<64;1;1M\x1b[<65;1;1M').map((event) => event.action), ['wheel-up', 'wheel-down']);
    assert.deepEqual(parser.parse('\x1b[<0;12;5m\x1b[<2;1;1M\x1b[<32;1;1M'), [], 'releases, other buttons and motion are not used');
    assert.deepEqual(parser.parse('\x1b[M !!'), [], 'the legacy encoding is dropped with its raw bytes');

    assert.deepEqual(parser.parse('a\x1b[<0;12'), [{ type: 'text', text: 'a' }], 'a report cut by a read waits for its rest');
    assert.deepEqual(parser.parse(';5Mb'), [{ type: 'pointer', action: 'press', row: 4, column: 11 }, { type: 'text', text: 'b' }]);
    assert.deepEqual(parser.parse('\x1b[1;5Cz'), [{ type: 'key', name: 'right', ctrl: true }, { type: 'text', text: 'z' }], 'modified keys are unchanged');

    const reports = [];
    assert.deepEqual(parser.parse('\x1b[7;1R'), [], 'without a listener a cursor report is dropped');
    parser.onCursorReport = (row, column) => reports.push([row, column]);
    assert.deepEqual(parser.parse('x\x1b[7;'), [{ type: 'text', text: 'x' }]);
    assert.deepEqual(parser.parse('1Ry'), [{ type: 'text', text: 'y' }], 'an answer of the terminal is not input');
    assert.deepEqual(reports, [[7, 1]]);
});

test('pointer tracking is asked for only while wanted, survives a stop and start, and always ends', () => {
    const writes = [];
    const listeners = new Set();
    const input = { isTTY: true, isRaw: false, setRawMode() {}, resume() {}, pause() {}, on: (_, listener) => listeners.add(listener), off: (_, listener) => listeners.delete(listener) };
    const events = [];
    const session = new KeyboardSession((event) => events.push(event), input, { write: (text) => writes.push(text) });
    const send = (text) => {
        for (const listener of listeners) listener(text);
    };
    const taken = () => writes.splice(0).join('');

    session.start();
    assert.doesNotMatch(taken(), /\?1000/, 'native selection stays until a surface asks');
    send('\x1b[<0;1;1M');
    assert.deepEqual(events, [], 'without tracking no surface sees a report');

    session.trackPointer(true);
    assert.equal(taken(), '\x1b[?1000h\x1b[?1006h');
    session.trackPointer(true);
    assert.equal(taken(), '', 'asking again repeats nothing');
    send('\x1b[<0;2;3M');
    assert.deepEqual(events.splice(0), [{ type: 'pointer', action: 'press', row: 2, column: 1 }]);

    session.stop();
    assert.match(taken(), /\x1b\[\?1006l\x1b\[\?1000l/, 'stopping ends tracking');
    session.start();
    assert.match(taken(), /\x1b\[\?1000h/, 'a restarted session continues tracking');
    session.trackPointer(false);
    assert.equal(taken(), '\x1b[?1006l\x1b[?1000l');
    session.stop();
    assert.doesNotMatch(taken(), /\?1000/, 'stopping does not end it twice');
    assert.equal(process.listeners('exit').filter((listener) => listener.name === 'endPointerOnExit').length, 0, 'no exit hook stays behind');
    assert.equal(process.listenerCount('SIGTERM'), 0, 'no signal hook stays behind');
});

test('the pointer is available where the terminal can report it and can be turned off', () => {
    assert.equal(allowsPointer({}, 'darwin'), true);
    assert.equal(allowsPointer({}, 'linux'), true);
    assert.equal(allowsPointer({ PTBK_TERMINAL_POINTER: 'off' }, 'darwin'), false);
    assert.equal(allowsPointer({}, 'win32'), false, 'a Windows console stays keyboard-only');
    assert.equal(allowsPointer({ PTBK_TERMINAL_POINTER: 'on' }, 'win32'), true);
});

test('an inline block knows its screen rows from the answer to its latest position question', () => {
    const writes = [];
    const renderer = new InlineRenderer({ columns: 80, rows: 24, write: (text) => writes.push(text) });
    assert.equal(renderer.rowAt(3), undefined, 'unknown before any answer');
    renderer.render(['first', 'second', 'third']);
    renderer.locate();
    assert.ok(writes.at(-1).endsWith('\x1b[6n'));
    renderer.located(10);
    assert.equal(renderer.rowAt(7), 0, 'the cursor stands on the last row, on screen row 9');
    assert.equal(renderer.rowAt(9), 2);
    assert.equal(renderer.rowAt(6), undefined);
    assert.equal(renderer.rowAt(10), undefined);

    renderer.render(['first', 'second', 'third'], { row: 1, column: 0 });
    renderer.locate();
    renderer.located(8);
    assert.equal(renderer.rowAt(6), 0, 'a visible cursor stands on its own row of the block');

    renderer.render(['first', 'second']);
    renderer.locate();
    renderer.locate();
    renderer.located(1);
    renderer.located(24);
    assert.equal(renderer.rowAt(23), 1, 'the answer to the latest question settles it, also after a late earlier answer');
});

test('a pointer position maps to the same cursor position the layout draws', () => {
    const editor = new TextEditor('hello world\nsecond');
    const first = editor.layout(40, 10);
    assert.equal(first.offsetAt(0, 6), 6);
    editor.placeCursor(first.offsetAt(0, 6));
    assert.deepEqual(editor.layout(40, 10).cursor, { row: 0, column: 6 });
    assert.equal(first.offsetAt(0, 30), 11, 'beyond the end of a line: its end, before the newline');
    assert.equal(first.offsetAt(1, 2), 14);
    assert.equal(first.offsetAt(5, 0), 18, 'below the text: its end');

    const wrapped = new TextEditor('abcdefghij');
    const rows = wrapped.layout(4, 10);
    assert.deepEqual(rows.lines, ['abcd', 'efgh', 'ij']);
    assert.equal(rows.offsetAt(1, 1), 5);
    assert.equal(rows.offsetAt(0, 9), 3, 'beyond a wrapped row: stays on that row');
    assert.equal(rows.offsetAt(2, 9), 10);

    const long = new TextEditor(Array.from({ length: 10 }, (_, line) => `line ${line}`).join('\n'));
    const scrolled = long.layout(40, 3);
    assert.equal(scrolled.hiddenAbove, 7);
    long.placeCursor(scrolled.offsetAt(0, 5));
    assert.deepEqual(long.layout(40, 3).cursor, { row: 0, column: 5 }, 'visible rows count from the scrolled top');

    const wide = new TextEditor('a界b');
    const cells = wide.layout(40, 3);
    assert.equal(cells.offsetAt(0, 1), 1, 'the first cell of a wide character: before it');
    assert.equal(cells.offsetAt(0, 2), 2, 'its second cell: after it');
    assert.equal(cells.offsetAt(0, 3), 2);

    const items = new TextEditor('x');
    items.placeCursor(1);
    items.paste(Array.from({ length: 8 }, () => 'pasted line').join('\n'));
    items.handle({ type: 'text', text: 'y' });
    const tokens = items.layout(60, 3);
    assert.match(tokens.lines[0], /^x\[Pasted text #1.*\]y$/);
    assert.equal(tokens.offsetAt(0, 2), 1, 'the start of an item: before it');
    assert.equal(tokens.offsetAt(0, tokens.lines[0].length - 2), 2, 'its end: after it, never inside the payload');
    assert.equal(tokens.offsetAt(0, tokens.lines[0].length - 1), 2);
    assert.equal(tokens.offsetAt(0, 50), 3);
});

test('the shared input places the cursor by pointer, moves focus between its fields and never submits', () => {
    const input = new RichInput({ mode: 'flow', attachments: true, refresh: () => undefined, initial: 'hello world' });
    const editor = input.editor;
    const field = (row = 5) => ({ row, column: 2, rows: 2, offsetAt: editor.layout(40, 2).offsetAt });
    const press = (row, column) => ({ type: 'pointer', action: 'press', row, column });

    assert.equal(input.point(press(5, 8), field()), 'changed');
    assert.deepEqual(editor.layout(40, 2).cursor, { row: 0, column: 6 });
    assert.equal(input.point(press(5, 0), field()), 'changed', 'on the border: the start of the row');
    assert.deepEqual(editor.layout(40, 2).cursor, { row: 0, column: 0 });
    assert.equal(input.point(press(4, 8), field()), 'ignored', 'outside the field nothing moves');
    assert.equal(input.point(press(7, 8), field()), 'ignored');
    assert.deepEqual(editor.layout(40, 2).cursor, { row: 0, column: 0 });
    assert.equal(input.handle(press(5, 8)), 'ignored', 'as a key event a pointer does nothing');

    const multiline = new RichInput({ mode: 'flow', refresh: () => undefined, initial: Array.from({ length: 8 }, (_, line) => `line ${line}`).join('\n') });
    multiline.point({ type: 'pointer', action: 'wheel-up', row: 0, column: 0 });
    assert.deepEqual(multiline.editor.layout(40, 20).cursor, { row: 4, column: 6 }, 'the wheel moves through the text');
    multiline.point({ type: 'pointer', action: 'wheel-down', row: 0, column: 0 });
    assert.deepEqual(multiline.editor.layout(40, 20).cursor, { row: 7, column: 6 });

    input.handle({ type: 'key', name: 'o', ctrl: true });
    assert.ok(input.attaching, 'the attach field is open');
    input.handle({ type: 'text', text: 'path' });
    const attachField = { row: 9, column: 15, rows: 1, offsetAt: input.attaching.layout(40, 1).offsetAt };
    assert.equal(input.point(press(9, 16), undefined, attachField), 'changed');
    assert.deepEqual(input.attaching.layout(40, 1).cursor, { row: 0, column: 1 });
    assert.equal(input.point(press(3, 3), undefined, attachField), 'ignored', 'with no text field drawn the attach field keeps focus');
    assert.ok(input.attaching);
    assert.equal(input.point({ type: 'pointer', action: 'wheel-up', row: 0, column: 0 }, field(), attachField), 'ignored');
    assert.equal(input.point(press(5, 4), field(), attachField), 'changed', 'a press on the text takes focus back');
    assert.equal(input.attaching, undefined);
    assert.equal(editor.value, 'hello world', 'the draft stays');
});
