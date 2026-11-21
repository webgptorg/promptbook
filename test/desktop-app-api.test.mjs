import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { AppConnection } from '../dist/app/connection.js';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { DESKTOP_OWNER } from '../dist/app/web/access.js';
import { createDesktopApiServer, startDesktopApi } from '../dist/app/web/desktop-api.js';
import { temporaryDirectory } from './helpers.mjs';

/** Native clients present the engine-issued capability on the local socket only. */
function get({ socketPath, token }, path, credential = token) {
    return new Promise((resolve, reject) => {
        const req = httpRequest({ socketPath, path, headers: { host: 'desktop.localhost', authorization: 'Bearer ' + credential } }, async (res) => {
            let text = '';
            for await (const chunk of res) text += chunk;
            resolve({ status: res.statusCode, text });
        });
        req.on('error', reject);
        req.end();
    });
}

test('the desktop owner uses real App settings without creating a remote owner, passkey or session', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk desktop actor');
    const connection = new AppConnection({ directory, env: {}, figures: () => ({}), onChange() {} });
    const [access, same] = await Promise.all([connection.projectAccess(), connection.projectAccess()]);
    assert.equal(access, same);
    const api = new EngineApi({ projectRoot: directory, stateDirectory: directory, engineId: () => undefined, hostname: () => undefined,
        dashboardUrl: () => 'https://app.ptbk.io', security: () => undefined, ui: () => ({}) });
    const url = 'https://desktop.localhost/api/v1';
    const local = (path, init) => api.handle(new Request(url + path, init), DESKTOP_OWNER, access);
    assert.equal((await (await local('/me')).json()).role, 'owner');
    const info = await (await local('/engine')).json();
    assert.equal(info.mode, 'local');
    assert.equal(info.dashboardUrl, 'https://projects.localhost/');
    await access.setDashboardRemovals(false, DESKTOP_OWNER);
    assert.equal(access.dashboardRemovals, false);
    await assert.rejects(access.setDashboardRemovals(true, { ...DESKTOP_OWNER }), /unauthenticated/);
    assert.equal(access.hasOwner, false);
    assert.deepEqual(access.sessions(), []);
    assert.deepEqual(access.passkeys(), []);
    const setup = await access.createSetupSecret();
    assert.ok(setup.secret, 'normal remote owner setup is still available');
    assert.equal(access.authenticate('local-desktop', DESKTOP_OWNER.client), undefined);
});

test('the private App pipe is scoped to the contract, authenticates independently and closes with its engine', async (t) => {
    const server = await startDesktopApi(async (request) => Response.json({ path: new URL(request.url).pathname, credential: request.headers.has('authorization') }));
    t.after(() => server.close());
    assert.equal((await get(server.endpoint, '/api/v1/me', 'invalid')).status, 401);
    assert.equal((await get(server.endpoint, '/auth/sign-in')).status, 404);
    const result = await get(server.endpoint, '/api/v1/me');
    assert.equal(result.status, 200);
    assert.deepEqual(JSON.parse(result.text), { path: '/api/v1/me', credential: false });
});

test('the native HTTP adapter streams uploads and events and cancels the engine stream when the window leaves', async (t) => {
    let cancelled;
    const stopped = new Promise((resolve) => { cancelled = resolve; });
    const server = createDesktopApiServer('fixture-only', async (request) => {
        if (request.method === 'POST') return new Response(await request.text(), { status: 201 });
        request.signal.addEventListener('abort', cancelled, { once: true });
        return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('id: 2\ndata: update\n\n')); } }),
            { headers: { 'content-type': 'text/event-stream' } });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/events';
    // Node's HTTP client lets the test reproduce the Host and bearer headers from the native pipe.
    const send = (method, token) => new Promise((resolve, reject) => {
        const req = httpRequest(url, { method, headers: { host: 'desktop.localhost', authorization: 'Bearer ' + token } }, resolve);
        req.on('error', reject);
        req.end(method === 'POST' ? 'file content' : undefined);
    });
    const denied = await send('GET', 'wrong');
    assert.equal(denied.statusCode, 401);
    denied.resume();
    const upload = await send('POST', 'fixture-only');
    assert.equal(upload.statusCode, 201);
    let body = '';
    for await (const chunk of upload) body += chunk;
    assert.equal(body, 'file content');
    const response = await send('GET', 'fixture-only');
    const first = await new Promise((resolve) => response.once('data', resolve));
    assert.match(first.toString(), /id: 2/);
    response.destroy();
    await Promise.race([stopped, new Promise((_, reject) => setTimeout(() => reject(new Error('SSE was not cancelled')), 3000).unref())]);
});
