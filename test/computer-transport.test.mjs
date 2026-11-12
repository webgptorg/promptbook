import assert from 'node:assert/strict';
import test from 'node:test';
import { computerCommand, computerTools } from '../dist/computer/agent-tools.js';
import { computerAppRequest } from '../dist/computer/viewer.js';
import { applyControlAction, CONTROL_ACTIONS } from '../dist/service/actions.js';

/** Native primitive validation rejects malformed JSON before the host can receive input. */
test('computer command parser validates coordinates, held buttons, key chords and bounded text', () => {
    assert.deepEqual(computerCommand({ op: 'move', x: 3, y: 9, durationMs: 350 }), { op: 'move', x: 3, y: 9, durationMs: 350 });
    assert.deepEqual(computerCommand({ op: 'key', keys: ['Control', 'c'] }), { op: 'key', keys: ['Control', 'c'] });
    for (const input of [
        { op: 'move', x: '3', y: 9 }, { op: 'click', x: 4 }, { op: 'click', count: 7 },
        { op: 'button', isDown: 'yes' }, { op: 'key', keys: [] }, { op: 'key', keys: [42] },
        { op: 'type', text: 'x'.repeat(100001) }, { op: 'clipboardWrite', text: false }, { op: 'launchShell', text: 'noop' },
    ]) assert.throws(() => computerCommand(input));
});

/** MCP image pixels stay exclusively in image content; every automatic mutation names its current frame. */
test('computer MCP tools forward fresh observation tokens and return live images separately', async () => {
    const calls = [];
    const control = {
        status: async () => ({ available: true }),
        release: async (agent) => calls.push({ release: agent }),
        execute: async (command, context) => {
            calls.push({ command, context });
            return command.op === 'screenshot' ? { data: 'private-pixels', mimeType: 'image/png', width: 100, height: 60, frame: 'f1' } : { done: true };
        },
    };
    const tools = computerTools(control, { agent: 'Adam' });
    const find = (name) => tools.find((tool) => tool.name === name);
    const screenshot = await find('computer_screenshot').handler({});
    assert.deepEqual(screenshot.images, [{ data: 'private-pixels', mimeType: 'image/png' }]);
    assert.equal(screenshot.text.includes('private-pixels'), false);
    const denied = await find('computer_click').handler({ x: 3, y: 4 });
    assert.equal(denied.isError, true);
    assert.equal(calls.length, 1);
    await find('computer_click').handler({ x: 3, y: 4, frame: 'f1' });
    assert.deepEqual(calls[1].context, { agent: 'Adam', frame: 'f1' });
    await find('computer_release').handler({});
    assert.deepEqual(calls.at(-1), { release: 'Adam' });
});

/** Only a gateway-authenticated owner can reach desktop screenshots and inputs. */
test('App desktop extension denies members, validates methods and never dispatches unknown routes', async () => {
    let calls = 0;
    const handle = async () => { calls++; return { data: 'private-pixels' }; };
    const screenshot = new Request('https://engine.example/api/v1/computer/screenshot');
    const denied = await computerAppRequest(screenshot, false, handle);
    assert.equal(denied.status, 403);
    assert.equal(calls, 0);
    const method = await computerAppRequest(new Request(screenshot.url, { method: 'POST' }), true, handle);
    assert.equal(method.status, 405);
    const unknown = await computerAppRequest(new Request('https://engine.example/api/v1/computer/shell'), true, handle);
    assert.equal(unknown.status, 404);
    assert.equal(calls, 0);
    const allowed = await computerAppRequest(screenshot, true, handle);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('cache-control'), 'no-store, private');
    assert.equal(calls, 1);
    assert.equal(await computerAppRequest(new Request('https://engine.example/api/v1/tasks'), true, handle), undefined);
});

/** State-changing requests use an exact method set and body size is bounded even without Content-Length. */
test('App desktop transport bounds input and does not replay an unconfirmed command', async () => {
    const calls = [];
    const handle = async (method, params) => { calls.push({ method, params }); return { ok: true }; };
    const body = { op: 'type', text: 'private-value' };
    const response = await computerAppRequest(new Request('https://engine.example/api/v1/computer/input', { method: 'POST', body: JSON.stringify(body) }), true, handle);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ method: 'computer-input', params: body }]);
    assert.equal((await response.text()).includes('private-value'), false);
    const large = await computerAppRequest(new Request('https://engine.example/api/v1/computer/input', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(140000) }) }), true, handle);
    assert.equal(large.status, 400);
    assert.equal(calls.length, 1);
});

/** The same owner actions are available to the terminal, Console and authenticated API. */
test('desktop control actions share one implementation and preserve status as a read', async () => {
    const calls = [];
    const computer = Object.fromEntries(['status', 'requestPermissions', 'pause', 'resume', 'stop'].map((method) => [method, async () => { calls.push(method); return { state: method }; }]));
    for (const action of ['computer-status', 'computer-permissions', 'computer-pause', 'computer-resume', 'computer-stop']) {
        assert.equal(CONTROL_ACTIONS.has(action), true);
        const result = await applyControlAction({}, action, {}, undefined, computer);
        assert.equal(result.applied, action !== 'computer-status');
    }
    assert.deepEqual(calls, ['status', 'requestPermissions', 'pause', 'resume', 'stop']);
});

/** The real loopback server exposes no desktop data before existing owner authentication succeeds. */
test('local desktop screenshots and inputs use the existing CSRF/bearer boundary', async (t) => {
    const { startHttpServer } = await import('../dist/service/http.js');
    const calls = [];
    const server = await startHttpServer({ agenda: {}, token: 'owner-token', port: 0, control: async () => ({}), computer: async (method, body) => { calls.push({ method, body }); return { data: 'private-live-frame' }; } });
    t.after(() => server.close());
    const screenshot = `${server.url}api/computer/screenshot`;
    assert.equal((await fetch(screenshot)).status, 401);
    assert.equal((await fetch(screenshot, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    assert.equal(calls.length, 0);
    const response = await fetch(screenshot, { headers: { Authorization: 'Bearer owner-token' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.deepEqual(calls[0], { method: 'computer-screenshot', body: {} });
    const session = await (await fetch(`${server.url}api/session`, { headers: { 'X-PTBK-Client': 'dashboard' } })).json();
    const body = { op: 'click', x: 1, y: 2 };
    const input = await fetch(`${server.url}api/computer/input`, { method: 'POST', headers: { 'X-PTBK-CSRF': session.csrf, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(input.status, 200);
    assert.deepEqual(calls[1], { method: 'computer-input', body });
    assert.equal((await fetch(`${server.url}api/computer/input`, { method: 'POST', headers: { 'X-PTBK-CSRF': session.csrf, Origin: 'https://outside.example' }, body: '{}' })).status, 409);
    assert.equal(calls.length, 2);
});

/** Immediate revocation cannot wait behind configuration/Git persistence, and a failed save never auto-resumes it. */
test('disabling or removing desktop control stops it before saving configuration', async () => {
    const { applyToolAction } = await import('../dist/service/actions.js');
    const calls = [];
    const agenda = {
        effectiveSettings: { tools: [{ type: 'COMPUTER_CONTROL', name: 'desktop', isEnabled: true }] },
        toolOperation: async () => { calls.push('save'); throw new Error('Git unavailable'); },
    };
    await assert.rejects(applyToolAction(agenda, { operation: { kind: 'disable', name: 'desktop' } }, 'test', async () => calls.push('stop')), /Git unavailable/);
    assert.deepEqual(calls, ['stop', 'save']);
    calls.length = 0;
    await assert.rejects(applyToolAction(agenda, { operation: { kind: 'remove', name: 'desktop' } }, 'test', async () => calls.push('stop')), /Git unavailable/);
    assert.deepEqual(calls, ['stop', 'save']);
});
