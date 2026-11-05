import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { PortSurface } from '../dist/ui/port-surface.js';
import { tabFeaturePage } from '../dist/ui/tab-page.js';
import { initializedProject, ptbk, ROOT, waitFor } from './helpers.mjs';

/**
 * Whether a real Chrome-compatible browser can run here.
 */
async function realBrowserSkip() {
    if (process.env.PTBK_TEST_BROWSER === '0') return 'PTBK_TEST_BROWSER=0';
    if (process.env.CI && process.env.PTBK_TEST_BROWSER !== '1') return 'runs on CI only with PTBK_TEST_BROWSER=1';
    return (await findBrowserExecutable({ variant: 'CHROME' })) ? false : 'no Chrome-compatible browser is installed';
}

/**
 * The desktop app's CLI controller as the Electron main process runs it: requests by id, and feature traffic without
 * replies (output by feature id, view input as `featureIn`).
 */
async function desktopBridge(t, env) {
    const child = fork(join(ROOT, 'apps', 'desktop', 'bridge.mjs'), [ROOT], { env, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const replies = new Map();
    const output = [];
    let next = 0;
    let ready;
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const started = new Promise((resolve, reject) => {
        ready = resolve;
        child.once('exit', (code) => reject(new Error(`The desktop controller exited (${code}): ${stderr}`)));
    });
    child.on('exit', (code) => {
        for (const reply of replies.values()) reply({ error: `The desktop controller exited (${code}): ${stderr}` });
    });
    child.on('message', (message) => {
        if (message.ready) return ready();
        if (typeof message.feature === 'string') return void output.push(message);
        replies.get(message.id)?.(message);
    });
    t.after(() => {
        if (child.connected) child.disconnect();
    });
    await started;
    return {
        output,
        child,
        request: async (method, params = {}) => {
            const id = ++next;
            const reply = await new Promise((resolve) => {
                replies.set(id, resolve);
                child.send({ id, method, params });
            });
            replies.delete(id);
            if (reply.error) throw new Error(reply.error);
            return reply.result;
        },
        send: (featureIn, input) => child.send({ featureIn, in: input }),
    };
}

/**
 * The page messages a feature posted (decoded).
 */
function pageMessages(output, feature) {
    return output.filter((item) => item.feature === feature && item.out?.kind === 'message').map((item) => JSON.parse(item.out.data));
}

test('port surface: the desktop transport speaks only over the app channel and the page attaches by its handshake', async () => {
    const posted = [];
    const received = [];
    const states = [];
    const surface = PortSurface.create({ page: tabFeaturePage({ browser: 'default', hint: 'Controls are in the bar above.' }), onMessage: (message) => received.push(message), onState: (state) => states.push(state) }, (outgoing) => posted.push(outgoing));
    const document = surface.document();
    assert.match(document, /window\.featureBridge/);
    assert.match(document, /http-equiv="Content-Security-Policy"/);
    assert.ok(!/new WebSocket|ws:\/\/|127\.0\.0\.1|token=/.test(document), 'no socket, address or token in the embedded document');
    assert.match(surface.policy, /connect-src 'none'/);
    assert.match(surface.policy, /script-src 'nonce-/);

    // Nothing is exchanged before the page's handshake; the welcome precedes the relay's first message.
    surface.send({ type: 'view' });
    surface.deliver({ kind: 'message', data: JSON.stringify({ type: 'input', events: [] }) });
    assert.deepEqual(posted, []);
    assert.deepEqual(received, []);
    surface.deliver({ kind: 'hello' });
    assert.deepEqual(JSON.parse(posted[0].data), { type: 'welcome' });
    assert.deepEqual(posted[1], { kind: 'state', state: 'attached' });
    surface.deliver({ kind: 'message', data: JSON.stringify({ type: 'resize', width: 10, height: 10 }) });
    surface.deliver({ kind: 'message', data: '[1]' });
    surface.deliver({ kind: 'message', data: 'not json' });
    assert.deepEqual(received, [{ type: 'resize', width: 10, height: 10 }]);

    // Closing the view detaches it; closing the surface tells the page why, once.
    surface.deliver({ kind: 'closed' });
    assert.equal(surface.state, 'detached');
    surface.deliver({ kind: 'hello' });
    await surface.close('Handed back.');
    await surface.close('again');
    assert.equal(posted.filter((item) => item.kind === 'state' && item.state === 'closed').length, 1);
    assert.deepEqual(JSON.parse(posted.at(-2).data), { type: 'ended', reason: 'Handed back.' });
    assert.deepEqual(states, ['attached', 'detached', 'attached', 'closed']);
});

test('desktop features: the app controller presents a controlled tab in an embedded view without a temporary server; closing the view keeps the tab with the user', { skip: await realBrowserSkip(), timeout: 240_000 }, async (t) => {
    const executable = await findBrowserExecutable({ variant: 'CHROME' });
    const { project, env: baseEnv } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const env = { ...baseEnv, CHROME_PATH: executable };
    const server = createServer((request, response) => {
        response.setHeader('content-type', 'text/html');
        response.end(`<title>Page ${request.url}</title><p>Page ${request.url}</p>`);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = (path) => `http://127.0.0.1:${server.address().port}${path}`;
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    assert.equal((await ptbk(['start', '--no-persist', '--raw', '--no-server'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    const control = async (method, params = {}) => await new ControlClient(projectAt(project), await readProcessRecord(projectAt(project))).request(method, params, 60_000);
    const bridge = await desktopBridge(t, env);

    const context = await bridge.request('feature-context', { root: project });
    assert.deepEqual(context.controls, []);
    assert.ok(context.browsers.length > 0, 'the enabled browsers are offered');

    // Taking control returns the view's document for the app to load; no listener or link exists.
    const opened = await bridge.request('tab-open', { root: project, url: url('/first') });
    assert.equal(opened.control.state, 'controlled');
    assert.ok(!('grant' in opened), 'the viewer grant stays in the controller');
    assert.match(opened.document, /window\.featureBridge/);
    assert.match(opened.policy, /connect-src 'none'/);
    assert.match(opened.permissions, /clipboard-read=\(self\)/);
    assert.equal((await control('snapshot')).tabControls[0].viewer, 'waiting');

    // The view's handshake attaches it; resizing it streams frames as binary output for that view only.
    bridge.send(opened.feature, { kind: 'hello' });
    await waitFor(() => pageMessages(bridge.output, opened.feature).some((message) => message.type === 'welcome'), { timeoutMs: 10_000, message: 'the welcome' });
    assert.equal(pageMessages(bridge.output, opened.feature)[0].type, 'welcome', 'the page learns it is attached first');
    await waitFor(async () => (await control('snapshot')).tabControls[0].viewer === 'connected', { timeoutMs: 20_000, message: 'the viewer to connect' });
    bridge.send(opened.feature, { kind: 'message', data: JSON.stringify({ type: 'resize', width: 800, height: 600, scale: 1 }) });
    await waitFor(() => bridge.output.some((item) => item.feature === opened.feature && item.out?.kind === 'binary'), { timeoutMs: 20_000, message: 'a streamed frame' });
    assert.equal(Buffer.from(bridge.output.find((item) => item.out?.kind === 'binary').out.data, 'base64').subarray(0, 2).toString('hex'), 'ffd8', 'frames arrive as JPEG');
    assert.ok(bridge.output.some((item) => item.feature === opened.feature && item.view?.url === url('/first')), 'the shell gets the tab view for its trusted controls');
    bridge.send(opened.feature, { kind: 'message', data: JSON.stringify({ type: 'navigate', action: 'go', url: url('/second') }) });
    await waitFor(() => pageMessages(bridge.output, opened.feature).some((message) => message.type === 'view' && message.view.url === url('/second')), { timeoutMs: 10_000, message: 'navigation from the toolbar' });

    // Closing the view only detaches the viewer: the tab stays reserved for the user, and reopening replaces the view.
    await bridge.request('feature-close', { feature: opened.feature, reason: 'The view was closed.' });
    await waitFor(async () => (await control('snapshot')).tabControls[0].viewer === 'detached', { timeoutMs: 20_000, message: 'the viewer to detach' });
    assert.equal((await control('snapshot')).tabControls[0].state, 'controlled');
    assert.ok(bridge.output.some((item) => item.feature === opened.feature && item.out?.kind === 'state' && item.out.state === 'closed'));
    const reopened = await bridge.request('tab-reopen', { root: project, id: opened.control.id });
    assert.notEqual(reopened.feature, opened.feature);
    bridge.send(reopened.feature, { kind: 'hello' });
    await waitFor(async () => (await control('snapshot')).tabControls[0].viewer === 'connected', { timeoutMs: 20_000, message: 'the reopened viewer' });
    assert.ok(!(await bridge.request('feature-context', { root: project })).controls[0].offer);

    // The shell's explicit handoff returns the tab; its view closes with the reason.
    const returned = await bridge.request('tab-action', { root: project, id: opened.control.id, action: 'handback' });
    assert.equal(returned.control.state, 'returned');
    await waitFor(() => bridge.output.some((item) => item.feature === reopened.feature && item.out?.kind === 'state' && item.out.state === 'closed'), { timeoutMs: 20_000, message: 'the view to close after the handoff' });
    assert.ok(pageMessages(bridge.output, reopened.feature).some((message) => message.type === 'ended'));
    assert.equal((await control('tab-control-tabs')).tabs.find((tab) => tab.targetId === opened.control.targetId).reserved, false);
    await assert.rejects(bridge.request('tab-action', { root: project, id: opened.control.id, action: 'teleport' }), /Unknown tab control action/);

    bridge.child.disconnect();
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});
