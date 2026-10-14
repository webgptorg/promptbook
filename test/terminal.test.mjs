import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createTerminal } from '../dist/coder/terminal.js';

/** In-memory terminal streams expose controls without touching the real TTY. */
function fixture(interactive = true, onControl) {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: interactive, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    const output = new EventEmitter();
    let text = '';
    Object.assign(output, { isTTY: interactive, rows: 6, columns: 60, write(chunk) { text += chunk; } });
    let cancelled = 0;
    const terminal = createTerminal(true, () => cancelled++, '/tmp', { input, output, onControl });
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
        view.key('x'); assert.equal(view.terminal.shouldStop(), true);
        assert.equal(view.cancelled(), 1);
        view.input.emit('keypress', '', { name: 'c', ctrl: true });
        assert.equal(view.cancelled(), 2);
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
    view.terminal.setSnapshot({ engineVersion: 'fixture', status: 'running' });
    view.terminal.output('partial');
    view.terminal.output(' line\n');
    view.terminal.status('Complete');
    view.terminal.close();
    assert.equal(view.text(), 'partial line\n[ptbk] Complete\n');
    assert.equal(view.input.isRaw, false);
});


test('shared terminal shortcuts report controls and accept synchronized API state', async () => {
    const controls = []; const view = fixture(true, (action, value) => controls.push({ action, value }));
    try {
        view.key('p'); assert.equal(view.terminal.isPaused(), true);
        view.terminal.setPaused(false); assert.equal(view.terminal.isPaused(), false);
        view.key('p'); view.key('p');
        view.key('x'); view.terminal.setStopping(false); assert.equal(view.terminal.shouldStop(), false);
        view.terminal.setWaiting(true); view.key('s'); view.key('q'); view.key('c');
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(controls.map(control => control.action), ['pause', 'pause', 'resume', 'finish', 'skip-wait', 'requests', 'settings']);
        assert.equal(controls[3].value, true); assert.match(view.text(), /Q requests, C settings/);
    } finally { view.terminal.close(); }
});

test('noninteractive terminal questions fail visibly without reading stdin', async () => {
    const view = fixture(false);
    try {
        await assert.rejects(view.terminal.question('Invisible input?'), /interactive terminal/);
        await assert.rejects(view.terminal.choose('Invisible choice?', [{ value: 'yes', label: 'Yes' }]), /interactive terminal/);
        await assert.rejects(view.terminal.chooseMany('Invisible choices?', [{ value: 'yes', label: 'Yes' }]), /interactive terminal/);
    }
    finally { view.terminal.close(); }
});

test('runtime choices isolate dashboard shortcuts and background output, then restore live controls', async () => {
    const controls = []; const view = fixture(true, action => controls.push(action));
    try {
        view.output.rows = 12;
        view.terminal.setSnapshot({ engineVersion: 'fixture', status: 'running', tasks: [], requests: [] });
        const result = view.terminal.choose('Approve the next task?', [{ value: 'yes', label: 'Yes, execute' }, { value: 'no', label: 'No, decline' }], 'no');
        view.input.emit('keypress', 'p', { name: 'p' });
        view.input.emit('keypress', 'q', { name: 'q' });
        view.terminal.output('background provider output\n');
        view.terminal.status('A new event arrived.');
        view.output.columns = 40; view.output.emit('resize');
        assert.match(view.text(), /Approve the next task/);
        view.input.emit('data', '\u001b[A\r');
        assert.equal(await result, 'yes');
        assert.deepEqual(controls, []);
        assert.equal(view.terminal.isPaused(), false);
        assert.equal(view.input.listenerCount('keypress'), 1);
        view.key('p');
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(controls, ['pause']);
        assert.equal(view.terminal.isPaused(), true);
        assert.match(view.text(), /Promptbook fixture/);
    } finally { view.terminal.close(); }
    assert.equal(view.input.isRaw, false);
    assert.equal(view.output.listenerCount('resize'), 0);
});

test('closing a runtime with an active picker cancels without restoring closed controls', async () => {
    const view = fixture();
    const result = view.terminal.choose('Pick a request:', [{ value: 'request', label: 'Pending request' }]);
    view.terminal.close();
    await assert.rejects(result, { name: 'AbortError' });
    assert.equal(view.input.isRaw, false);
    assert.equal(view.input.listenerCount('keypress'), 0);
    assert.equal(view.output.listenerCount('resize'), 0);
});

test('focused runtime pickers distinguish interrupt, dismissal and pasted Ctrl+C', async () => {
    const view = fixture();
    try {
        const dismissed = view.terminal.choose('Pick a request:', [{ value: 'request', label: 'Pending request' }]);
        view.input.emit('data', '\u001b[200~\u0003\u001b[201~');
        assert.equal(view.cancelled(), 0);
        view.input.emit('data', '\u001b');
        await assert.rejects(dismissed, { name: 'AbortError' });
        assert.equal(view.cancelled(), 0);
        const interrupted = view.terminal.chooseMany('Pick requests:', [{ value: 'request', label: 'Pending request' }]);
        view.input.emit('data', '\u0003');
        await assert.rejects(interrupted, { name: 'AbortError' });
        assert.equal(view.cancelled(), 1);
    } finally { view.terminal.close(); }
});

test('focused runtime text entry interrupts only on genuine Ctrl+C', async () => {
    const view = fixture();
    try {
        const pasted = view.terminal.question('Answer this request:');
        view.input.emit('data', '\u001b[200~pasted\u0003 reply\u001b[201~\u0013');
        assert.equal(await pasted, 'pasted reply');
        assert.equal(view.cancelled(), 0);
        const dismissed = view.terminal.question('Answer this request:');
        view.input.emit('data', '\u001b');
        await assert.rejects(dismissed, { name: 'AbortError' });
        assert.equal(view.cancelled(), 0);
        const interrupted = view.terminal.question('Answer this request:');
        view.input.emit('data', '\u0003');
        await assert.rejects(interrupted, { name: 'AbortError' });
        assert.equal(view.cancelled(), 1);
    } finally { view.terminal.close(); }
});

test('idle setup blockers explain discovery and repair without implying a provider wait', () => {
    const view = fixture();
    try {
        view.output.rows = 30; view.output.columns = 120;
        view.terminal.setSnapshot({ engineVersion: 'fixture', project: '/tmp', mode: 'daemon', status: 'setup-required', running: false, waiting: false,
            idleReason: 'openai-codex: codex was not found on PATH.', nextAction: 'Restart ptbk from the configured terminal.', nextOpportunity: Date.now() + 30_000,
            tasks: [], requests: [], statistics: { completed: 0, failed: 0 } });
        assert.match(view.text(), /Blocked \/ failed/);
        assert.match(view.text(), /codex was not found on PATH/);
        assert.match(view.text(), /Next: Restart ptbk from the configured terminal/);
        assert.match(view.text(), /Next opportunity:/);
        assert.doesNotMatch(view.text(), /Waiting for provider|pacing\/backoff wait/);
    } finally { view.terminal.close(); }
});

test('dashboard separates state, queue, results and requests with semantic presentation and suppressed-color parity', () => {
    const prior = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    const view = fixture();
    try {
        view.output.rows = 24; view.output.columns = 100;
        view.terminal.setSnapshot({ engineVersion: 'fixture', project: '/tmp', mode: 'interactive', status: 'paused', phase: 'checks', paused: true,
            currentTask: 'current', currentSelection: { agent: 'Adam', harness: 'unfeatured-provider', model: 'model-one' },
            tasks: [{ id: 'current', title: 'Current task', status: 'in-progress' }], requests: [{ id: 'pending', prompt: 'Review the result', reason: 'Human review' }],
            statistics: { completed: 2, failed: 1 }, pendingSettings: { model: 'next-model' }, restartSettings: { port: 4000 } });
        assert.match(view.text(), /Promptbook fixture/);
        assert.match(view.text(), /Agent: Adam · Paused · Harness: unfeatured-provider/);
        assert.match(view.text(), /Queue \(1\)/);
        assert.match(view.text(), /Results: 2 completed · 1 failed/);
        assert.match(view.text(), /Requests \(1\)/);
        assert.match(view.text(), /pending safe boundary/);
        assert.match(view.text(), /restart required/);
        assert.doesNotMatch(view.text(), /\u001b\[\d+(?:;\d+)*m/);
        view.clear(); view.output.columns = 20; view.output.rows = 6; view.output.emit('resize');
        assert(view.text().split('\r\n').length <= 6);
        view.key('d');
        assert.match(view.text(), /Details/);
    } finally {
        view.terminal.close();
        if (prior === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = prior;
    }
});
