import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachDashboard } from '../dist/coder/attached-dashboard.js';

/** Client surfaces expose keys and disconnects without creating a service or real terminal. */
function fixture(interactive = true) {
    const input = new EventEmitter();
    let reads = 0;
    Object.assign(input, { isTTY: interactive, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() { reads++; }, pause() {} });
    const output = new EventEmitter();
    let text = '';
    Object.assign(output, { isTTY: interactive, rows: 24, columns: 100, write(chunk) { text += chunk; return true; } });
    return { input, output, text: () => text, reads: () => reads, key: (name, ctrl = false) => input.emit('keypress', '', { name, ctrl }) };
}

/** An authenticated fixture snapshot has the same project/process identity on every observation. */
function snapshot(change = {}) {
    return { id: 'service-one', pid: 123, project: '/fixture/project', engineVersion: '1.2.3', mode: 'daemon', status: 'watching', phase: 'idle', tasks: [], requests: [], statistics: { completed: 0, failed: 0 }, events: [], ...change };
}

/** A single turn lets initial inspection and focused controls settle. */
const tick = () => new Promise(resolve => setImmediate(resolve));

/** These paths are inspected only through the injected authenticated command fixture. */
const workspace = { projectPath: '/fixture/project', statePath: '/fixture/project/.ptbk', tasksPath: '/fixture/project/tasks', legacyPath: '/fixture/project/prompts', timezone: 'UTC' };

test('raw dashboard continuously observes one service without input, cursor controls or duplicate evidence', async () => {
    const view = fixture(true);
    const calls = [];
    const event = { type: 'check', time: 1, message: 'Checks passed' };
    const states = [snapshot({ events: [event] }), snapshot({ paused: true, statistics: { completed: 2, failed: 0 }, events: [event] }), snapshot({ status: 'stopped', events: [event] })];
    await attachDashboard(workspace, { ...view, raw: true, pollIntervalMs: 10, command: async (_workspace, action, input, identity) => { calls.push({ action, input, identity }); return states.shift(); } });
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map(call => call.action), ['inspect', 'inspect', 'inspect']);
    assert.equal(calls[0].identity, undefined);
    assert.deepEqual(calls[1].identity, { id: 'service-one', pid: 123 });
    assert.match(view.text(), /Promptbook 1\.2\.3/);
    assert.match(view.text(), /2 completed/);
    assert.match(view.text(), /paused/);
    assert.equal(view.text().match(/Checks passed/g).length, 1);
    assert.match(view.text(), /Service stopped; dashboard observation ended/);
    assert.doesNotMatch(view.text(), /\u001b|Controls:|┌|──/);
    assert.equal(view.reads(), 0);
});

test('Q, Ctrl+C and terminal disconnection close only attached clients', async () => {
    for (const leave of [view => view.key('q'), view => view.key('c', true), view => view.input.emit('end')]) {
        const view = fixture(); const calls = [];
        const result = attachDashboard(workspace, { ...view, command: async (_workspace, action) => { calls.push(action); return snapshot(); } });
        await tick();
        assert.match(view.text(), /attached/);
        leave(view);
        await result;
        assert.deepEqual(calls, ['inspect']);
        assert.match(view.text(), /service continues independently/);
        assert.equal(view.input.isRaw, false);
        assert.equal(view.input.listenerCount('keypress'), 0);
        assert.equal(view.input.listenerCount('end'), 0);
        assert.equal(view.output.listenerCount('resize'), 0);
    }
});

test('attached X explicitly requests graceful service stop, then cancellation; leaving remains separate', async () => {
    const view = fixture(); const actions = [];
    const result = attachDashboard(workspace, { ...view, command: async (_workspace, action, input, identity) => {
        actions.push(action);
        if (action === 'inspect') return snapshot({ running: true });
        assert.deepEqual(identity, { id: 'service-one', pid: 123 });
        return { finishAfterTask: true };
    } });
    await tick();
    view.key('x'); await tick();
    view.key('x'); await tick();
    view.key('q'); await result;
    assert.deepEqual(actions, ['inspect', 'finish', 'finish']);
    assert.match(view.text(), /Cancellation requested for owned work/);
    assert.match(view.text(), /Q leave/);
});

test('attached requests use selectable answers while controls are suspended', async () => {
    const view = fixture(); const calls = [];
    const request = { id: 'request-one', prompt: 'Approve this action?', reason: 'Authorization needed', choices: ['Yes', 'No'] };
    const result = attachDashboard(workspace, { ...view, command: async (_workspace, action, value, identity) => {
        calls.push({ action, value, identity });
        return action === 'inspect' ? snapshot({ requests: [request] }) : { status: 'answered' };
    } });
    await tick(); view.key('r'); await tick();
    view.input.emit('data', '\r'); await tick();
    view.key('p');
    view.input.emit('data', '\u001b[B\r'); await tick();
    view.key('q'); await result;
    assert.deepEqual(calls.map(call => call.action), ['inspect', 'answer']);
    assert.deepEqual(calls[1].value, { id: 'request-one', response: 'No' });
    assert.deepEqual(calls[1].identity, { id: 'service-one', pid: 123 });
});

test('missing, lost and changed service identities produce actionable outcomes without replacement workers', async () => {
    const missing = fixture(false);
    await assert.rejects(attachDashboard(workspace, { ...missing, command: async () => undefined }), /No reachable service.*ptbk start/s);
    for (const later of [undefined, snapshot({ id: 'replacement', pid: 456 })]) {
        const view = fixture(false); const calls = [];
        await attachDashboard(workspace, { ...view, pollIntervalMs: 10, command: async (_workspace, action) => { calls.push(action); return calls.length === 1 ? snapshot() : later; } });
        assert.deepEqual(calls, ['inspect', 'inspect']);
        assert.match(view.text(), later ? /identity changed/ : /connection lost/);
        assert.doesNotMatch(view.text(), /\u001b/);
    }
});

test('client abort stops observation and raw never starts a hidden request prompt', async () => {
    const view = fixture(); const controller = new AbortController(); const calls = [];
    const result = attachDashboard(workspace, { ...view, raw: true, signal: controller.signal, command: async (_workspace, action) => { calls.push(action); return snapshot({ requests: [{ id: 'pending', prompt: 'Choose an answer', choices: ['A', 'B'] }] }); } });
    await tick(); controller.abort(); await result;
    assert.deepEqual(calls, ['inspect']);
    assert.equal(view.reads(), 0);
    assert.match(view.text(), /Requests: 1/);
    assert.match(view.text(), /ptbk answer/);
});

test('disconnecting a destroyed terminal releases the dashboard without writing or restoring the closed device', async () => {
    const view = fixture(); const calls = [];
    const result = attachDashboard(workspace, { ...view, command: async (_workspace, action) => { calls.push(action); return snapshot(); } });
    await tick();
    view.input.destroyed = true; view.output.destroyed = true;
    view.input.setRawMode = () => assert.fail('A disconnected input device cannot be restored.');
    view.output.write = () => assert.fail('A disconnected output device cannot receive cursor cleanup.');
    view.output.emit('close');
    await result;
    assert.deepEqual(calls, ['inspect']);
    assert.equal(view.input.listenerCount('keypress'), 0);
    assert.equal(view.output.listenerCount('resize'), 0);
});

test('attached task editing preserves the inspected revision and requires an explicit Save decision', async () => {
    for (const save of [true, false]) {
        const view = fixture(); const calls = [];
        const original = 'TASK Example\n\nOriginal source.\n';
        const revision = 'exact-original-revision';
        const result = attachDashboard(workspace, { ...view, command: async (_workspace, action, value, identity) => {
            calls.push({ action, value, identity });
            if (action === 'inspect') return snapshot({ controlCapabilities: { actions: ['read-task', 'edit-task'] }, tasks: [{ id: 'task-one', title: 'Example', status: 'todo', source: { relativePath: 'tasks/example.book' } }] });
            if (action === 'read-task') return { id: 'task-one', revision, content: original, source: 'tasks/example.book' };
            if (action === 'edit-task') return { saved: true };
            assert.fail(`Unexpected service action: ${action}`);
        } });
        await tick(); view.key('e'); await tick();
        view.input.emit('data', '\r'); await tick();
        assert.match(view.text(), /Original source/);
        view.input.emit('data', '\u001b[200~Added details.\n\u001b[201~\u0013'); await tick();
        assert.match(view.text(), /Save changes/);
        view.input.emit('data', save ? '\u001b[A\r' : '\r'); await tick();
        view.key('q'); await result;
        assert.deepEqual(calls.map(call => call.action), save ? ['inspect', 'read-task', 'edit-task'] : ['inspect', 'read-task']);
        assert.deepEqual(calls[1].value, { id: 'task-one' });
        if (save) {
            assert.deepEqual(calls[2].value, { id: 'task-one', revision, content: `${original}Added details.\n` });
            assert.deepEqual(calls[2].identity, { id: 'service-one', pid: 123 });
        }
    }
});

test('task editing stays disabled when the observed runtime lacks guarded edit capabilities', async () => {
    const view = fixture(); const calls = [];
    const result = attachDashboard(workspace, { ...view, command: async (_workspace, action) => { calls.push(action); return snapshot({ controlCapabilities: { actions: ['inspect', 'pause'] } }); } });
    await tick(); view.key('e'); await tick();
    view.key('q'); await result;
    assert.deepEqual(calls, ['inspect']);
    assert.match(view.text(), /Task editing is unavailable/);
});
