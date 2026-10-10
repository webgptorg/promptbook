import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createTerminal } from '../dist/coder/terminal.js';

/** In-memory terminal streams expose controls without touching the real TTY. */
function fixture(interactive = true) {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: interactive, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    const output = new EventEmitter();
    let text = '';
    Object.assign(output, { isTTY: interactive, rows: 6, columns: 60, write(chunk) { text += chunk; } });
    let cancelled = 0;
    const terminal = createTerminal(true, () => cancelled++, '/tmp', { input, output });
    return { input, output, terminal, text: () => text, clear: () => { text = ''; }, key: name => input.emit('keypress', '', { name }), cancelled: () => cancelled };
}

test('Normal output buffers split JSON and distinguishes agent and coder messages', () => {
    const view = fixture();
    try {
        view.clear();
        view.terminal.output('{"type":"item.completed","item":{"type":"agent_message","te');
        assert.equal(view.text(), '');
        view.terminal.output('xt":"Ready"}}\n');
        assert.equal(view.text(), '[agent] Ready\n');
        view.terminal.status('Checks passed');
        assert.match(view.text(), /\[ptbk\] Checks passed/);
        view.key('o');
        view.clear();
        view.terminal.output('{"type":"item.started"}\n');
        assert.equal(view.text(), '{"type":"item.started"}\n');
    } finally { view.terminal.close(); }
});

test('skip affects only the current wait and controls give immediate feedback', () => {
    const view = fixture();
    try {
        view.key('s');
        assert.match(view.text(), /no pacing\/backoff wait to skip/);
        view.terminal.setWaiting(true);
        assert.equal(view.terminal.skipWait(), false);
        view.key('s');
        assert.equal(view.terminal.skipWait(), true);
        assert.equal(view.terminal.skipWait(), false);
        view.key('p'); assert.equal(view.terminal.isPaused(), true);
        view.key('p'); assert.equal(view.terminal.isPaused(), false);
        view.key('x'); assert.equal(view.terminal.shouldStop(), true);
        view.key('x'); assert.equal(view.terminal.shouldStop(), false);
        view.input.emit('keypress', '', { name: 'c', ctrl: true });
        assert.equal(view.cancelled(), 1);
    } finally { view.terminal.close(); }
});

test('scroll and resize render bounded history and restore the terminal', () => {
    const view = fixture();
    for (let index = 0; index < 200; index++) view.terminal.output(`row ${index}\n`);
    view.clear();
    view.key('up');
    assert.match(view.text(), /\u001b\[\?1049h/);
    assert.match(view.text(), /Normal history/);
    view.clear();
    view.output.rows = 4;
    view.output.emit('resize');
    assert(view.text().split('\n').length <= 4);
    assert.doesNotMatch(view.text(), /row 0\n/);
    view.key('end');
    assert.match(view.text(), /\u001b\[\?1049l/);
    view.terminal.output('z'.repeat(9000));
    assert.match(view.text(), /output truncated/);
    view.terminal.close();
    assert.equal(view.input.isRaw, false);
    assert.equal(view.output.listenerCount('resize'), 0);
});

test('non-TTY output streams immediately without dashboard escapes', () => {
    const view = fixture(false);
    view.terminal.output('partial');
    view.terminal.output(' line\n');
    view.terminal.status('Complete');
    view.terminal.close();
    assert.equal(view.text(), 'partial line\n[ptbk] Complete\n');
    assert.equal(view.input.isRaw, false);
});
