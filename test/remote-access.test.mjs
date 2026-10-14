import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { request as httpRequest } from 'node:http';
import { DashboardAccess } from '../dist/coder/dashboard-access.js';
import { openDashboard } from '../dist/coder/dashboard-server.js';
import { ManagedTunnel } from '../dist/coder/tunnel.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { redactSecrets } from '../dist/coder/harness.js';

/** Keep access/session fixtures independent of the network and the user's credentials. */
async function fixture(t) {
    const project = await realpath(await mkdtemp(join(tmpdir(), 'ptbk remote ')));
    t.after(() => rm(project, { recursive: true, force: true }));
    return resolveWorkspace({ path: project });
}
/** Represent exactly one owned connector; termination never affects other processes. */
function connector(url = 'https://fixture.trycloudflare.com', registered = true) {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.exitCode = null; child.signalCode = null;
    child.kill = signal => { queueMicrotask(() => { child.signalCode = signal; child.emit('exit', null, signal); }); return true; };
    queueMicrotask(() => child.stderr.write(`Assigned ${url}\n${registered ? 'Registered tunnel connection\n' : ''}`));
    return child;
}

test('pairing is single-use, expiring and unchanged by inspection; grants are private and revocable', async t => {
    const workspace = await fixture(t); let now = Date.now();
    const access = await DashboardAccess.open(workspace, () => now);
    const link = access.link('https://fixture.trycloudflare.com');
    for (let count = 0; count < 5; count++) assert.equal(access.link('https://fixture.trycloudflare.com'), link);
    const value = new URLSearchParams(new URL(link).hash.slice(1)).get('pair');
    const results = await Promise.allSettled([access.redeem(value), access.redeem(value)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const session = results.find(result => result.status === 'fulfilled').value;
    assert.equal(access.authenticate(session.token, 'device'), true);
    assert.equal(access.link('https://fixture.trycloudflare.com'), undefined);
    const reopened = await DashboardAccess.open(workspace, () => now);
    assert.equal(reopened.status().status, 'consumed');
    assert.equal(reopened.authenticate(session.token, 'device'), true);
    assert(!JSON.stringify(reopened.devices()).includes(session.token));
    await reopened.revoke(reopened.devices()[0].id);
    assert.equal(reopened.authenticate(session.token, 'device'), false);
    await reopened.renew(); now += 10 * 60_000;
    assert.equal(reopened.status().status, 'expired');
    await assert.rejects(reopened.redeem(value), /expired/);
    const api = await reopened.issueApi();
    assert.equal(reopened.authenticate(api.token, 'api'), true);
    assert.equal(reopened.authenticate(api.token, 'device'), false);
    now += 7 * 24 * 60 * 60_000;
    assert.equal(reopened.authenticate(api.token, 'api'), false);
    if (process.platform !== 'win32') assert.equal((await stat(join(workspace.statePath, 'access.json'))).mode & 0o777, 0o600);
    assert(!JSON.stringify(reopened.status()).includes(value));
    assert(!redactSecrets(link).includes(value));
});

test('public shell discloses no project data; pairing sessions enforce origin, revocation and local-only renewal', async t => {
    const workspace = await fixture(t); const secretProject = 'private-project-task-content'; const calls = [];
    let children = 0;
    const page = await openDashboard(workspace, { token: randomUUID(), snapshot: async () => ({ tasks: [{ title: secretProject }] }), command: async action => { calls.push(action); return { applied: true }; } }, undefined, {}, {
        findClient: async () => 'fixture', spawn: () => { children++; return connector(); }, verify: async () => true, attemptMs: 200,
    });
    t.after(() => page.close()); await page.startTunnel(); await page.startTunnel(); assert.equal(children, 1);
    assert.equal(page.connection().remote.status, 'ready');
    const origin = page.connection().remote.url;
    const headers = { Host: new URL(origin).host, Origin: origin, 'Content-Type': 'application/json' };
    const request = (route, options = {}) => new Promise((accept, reject) => {
        const req = httpRequest(page.url + route, { headers, ...options }, response => {
            const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.once('end', () => accept(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
        }); req.once('error', reject); req.end(options.body);
    });
    assert.equal((await request('/')).status, 200);
    assert(!(await (await request('/')).text()).includes(secretProject));
    assert.equal((await request('/api/state')).status, 403);
    assert.equal((await request('/api/control', { method: 'POST', body: JSON.stringify({ action: 'stop' }) })).status, 403);
    const link = page.trustedConnection().pairingUrl;
    assert(!JSON.stringify(page.connection()).includes('#pair='));
    const capability = new URLSearchParams(new URL(link).hash.slice(1)).get('pair');
    const paired = await request('/api/pair', { method: 'POST', body: JSON.stringify({ capability }) });
    assert.equal(paired.status, 200);
    const cookie = paired.headers.get('set-cookie').split(';')[0];
    assert.match(paired.headers.get('set-cookie'), /HttpOnly; SameSite=Strict.*Secure/);
    const state = await request('/api/state', { headers: { ...headers, Cookie: cookie } });
    assert.equal(state.status, 200); assert((await state.text()).includes(secretProject)); assert.match(state.headers.get('cache-control'), /no-store/);
    assert.equal((await request('/api/pair', { method: 'POST', body: JSON.stringify({ capability }) })).status, 400);
    const post = action => ({ method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify({ action }) });
    assert.equal((await request('/api/control', post('pause'))).status, 200); assert.deepEqual(calls, ['pause']);
    assert.equal((await request('/api/control', { ...post('stop'), headers: { ...headers, Origin: 'https://attacker.example', Cookie: cookie } })).status, 403);
    assert.equal((await request('/api/control', post('pair-renew'))).status, 403);
    assert.equal((await request('/api/control', { ...post('stop'), headers: { ...headers, Origin: '', Cookie: cookie } })).status, 403);
    const issued = await page.trustedCommand('api-token');
    assert.equal((await request('/api/control', { method: 'POST', headers: { Host: new URL(origin).host, Authorization: `Bearer ${issued.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }) })).status, 200);
    await page.trustedCommand('access-revoke');
    assert.equal((await request('/api/state', { headers: { ...headers, Cookie: cookie } })).status, 403);
    assert.equal((await request('/api/state', { headers: { ...headers, Authorization: `Bearer ${issued.token}` } })).status, 403);
    assert.equal(page.trustedConnection().pairingUrl, undefined);
    await page.trustedCommand('pair-renew'); assert.notEqual(page.trustedConnection().pairingUrl, link);
    const saved = await readFile(join(workspace.statePath, 'access.json'), 'utf8'); assert(!saved.includes(issued.token));
});

test('disabled publishing contacts no provider; failures never leave a stale-ready URL or duplicate a connector', async t => {
    const workspace = await fixture(t); let calls = 0; let origin;
    const disabled = new ManagedTunnel(workspace, { noTunnel: true }, 'http://127.0.0.1:4567', 'challenge', value => { origin = value; }, { findClient: async () => { calls++; throw Error('must not contact provider'); } });
    await disabled.start(); await disabled.close(); assert.equal(calls, 0); assert.equal(disabled.state.enabled, false);
    const failed = new ManagedTunnel(workspace, {}, 'http://127.0.0.1:4567', 'challenge', value => { origin = value; }, { findClient: async () => 'fixture', spawn: () => { calls++; return connector(); }, verify: async () => false, attemptMs: 40, retryMs: 5000 });
    await failed.start(); assert.equal(calls, 1); assert.equal(failed.state.status, 'degraded'); assert.equal(failed.state.url, undefined); assert.equal(origin, undefined);
    assert(failed.state.nextAttemptAt > Date.now()); await failed.close(); assert.equal(calls, 1);
    assert.throws(() => new ManagedTunnel(workspace, { tunnelProvider: 'unsupported' }, 'http://127.0.0.1:4567', '', () => {}), /Unknown/);
    assert.throws(() => new ManagedTunnel(workspace, { tunnelProvider: 'cloudflare-named' }, 'http://127.0.0.1:4567', '', () => {}), /requires/);
});

test('failed authentication is limited without disabling authorized clients, and API grants cannot cross projects', async t => {
    const first = await fixture(t); const second = await fixture(t);
    const control = () => ({ token: randomUUID(), snapshot: async () => ({ tasks: [] }), command: async () => ({ applied: true }) });
    const firstPage = await openDashboard(first, control()); const secondPage = await openDashboard(second, control());
    t.after(() => firstPage.close()); t.after(() => secondPage.close());
    const credential = await firstPage.trustedCommand('api-token');
    for (let index = 0; index < 30; index++) assert.equal((await fetch(firstPage.url + '/api/state')).status, 403);
    assert.equal((await fetch(firstPage.url + '/api/state')).status, 429);
    const headers = { Authorization: `Bearer ${credential.token}` };
    assert.equal((await fetch(firstPage.url + '/api/state', { headers })).status, 200);
    assert.equal((await fetch(secondPage.url + '/api/state', { headers })).status, 403);
});

/** Named connectors reuse supplied credentials and never fall back to an ephemeral provider. */
test('named tunnels publish only the configured hostname and route precisely the actual protected port', async t => {
    const workspace = await fixture(t);
    const credentials = join(workspace.projectPath, 'connector.json');
    await writeFile(credentials, '{}', { mode: 0o600 });
    const options = { tunnelProvider: 'cloudflare-named', tunnelHostname: 'dashboard.example.com', tunnelId: '00000000-0000-4000-8000-000000000000', tunnelCredentialsFile: credentials };
    const origins = []; let commandArgs;
    const tunnel = new ManagedTunnel(workspace, options, 'http://127.0.0.1:43219', 'fixture', origin => origins.push(origin), {
        findClient: async () => 'fixture', spawn: (_command, args) => { commandArgs = args; return connector(); }, verify: async origin => origin === 'https://dashboard.example.com', attemptMs: 100,
    });
    await tunnel.start(); t.after(() => tunnel.close());
    assert.equal(tunnel.state.status, 'ready'); assert.equal(tunnel.state.url, 'https://dashboard.example.com');
    assert.deepEqual(commandArgs.slice(-2), ['run', options.tunnelId]);
    const configuration = JSON.parse(await readFile(commandArgs[commandArgs.indexOf('--config') + 1], 'utf8'));
    assert.equal(configuration['credentials-file'], credentials);
    assert.deepEqual(configuration.ingress, [{ hostname: options.tunnelHostname, service: 'http://127.0.0.1:43219' }, { service: 'http_status:404' }]);
    assert(!origins.some(origin => origin?.includes('trycloudflare.com')));
    const misleading = new ManagedTunnel(workspace, options, 'http://127.0.0.1:43219', 'fixture', () => {}, {
        findClient: async () => 'fixture', spawn: () => connector('https://unexpected.trycloudflare.com', false), verify: async () => true, attemptMs: 30, retryMs: 5000,
    });
    await misleading.start(); assert.equal(misleading.state.status, 'degraded'); assert.equal(misleading.state.url, undefined); await misleading.close();
});

test('two paired loopback projects retain independent browser cookies and redact their session values', async t => {
    const first = await fixture(t); const second = await fixture(t);
    const control = () => ({ token: randomUUID(), snapshot: async () => ({ tasks: [] }), command: async () => ({}) });
    const pages = [await openDashboard(first, control()), await openDashboard(second, control())];
    t.after(() => Promise.all(pages.map(page => page.close())));
    const cookies = [];
    for (const page of pages) {
        const capability = new URLSearchParams(new URL(page.sessionUrl).hash.slice(1)).get('pair');
        const response = await fetch(page.url + '/api/pair', { method: 'POST', headers: { Origin: page.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ capability }) });
        assert.equal(response.status, 200); cookies.push(response.headers.get('set-cookie').split(';')[0]);
    }
    assert.notEqual(cookies[0].split('=')[0], cookies[1].split('=')[0]);
    for (const page of pages) assert.equal((await fetch(page.url + '/api/state', { headers: { Cookie: cookies.join('; ') } })).status, 200);
    for (const cookie of cookies) assert(!redactSecrets(cookie).includes(cookie.split('=')[1]));
});
