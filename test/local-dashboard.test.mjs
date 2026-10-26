import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ENGINE_VERSION } from '../dist/common/version.js';
import { canonicalizeConfig, interpretConfig, parseConfigText, SETTING_SPECS } from '../dist/project/config.js';
import { maintainProjectConfiguration } from '../dist/project/configuration.js';
import { applyConfigurationMigration, planConfigurationMigration } from '../dist/project/migrations.js';
import { projectAt } from '../dist/project/workspace.js';
import { git, initializedProject, ptbk, subjects } from './helpers.mjs';

/**
 * Obsolete settings deliberately contain invalid provider data: removal must never validate or print their values.
 */
const REMOTE_SETTINGS = { isEnabled: true, provider: 'removed-provider', tokenEnv: 'NEVER_CONTACT_PROVIDER', credentialsFile: 'private-provider-reference' };

/**
 * Makes old dashboard settings in an otherwise current project without changing local choices.
 */
function withRemoteSettings(config) {
    return { ...config, server: { ...config.server, isEnabled: false, tunnel: REMOTE_SETTINGS }, service: { ...config.service, isPersistent: false, qr: false, isQrShown: true }, customDashboardData: { keep: true } };
}

test('retired dashboard settings migrate and normalize without changing local settings or revealing provider values', () => {
    const original = withRemoteSettings({ promptbookVersion: '0.119.0-34', server: { port: 43123 } });
    const plan = planConfigurationMigration(original);
    assert.equal(plan.kind, 'migrate');
    assert.deepEqual(plan.steps.map((step) => step.target), ['0.119.0-35']);
    const migrated = applyConfigurationMigration(original, plan);
    assert.deepEqual(migrated.problems, []);
    assert.deepEqual(migrated.raw.server, { port: 43123, isEnabled: false });
    assert.deepEqual(migrated.raw.service, { isPersistent: false });
    assert.deepEqual(migrated.raw.customDashboardData, { keep: true });
    assert.equal(original.server.tunnel, REMOTE_SETTINGS, 'the input is not mutated');
    assert.doesNotMatch(JSON.stringify(migrated.notes), /private-provider-reference|NEVER_CONTACT_PROVIDER|removed-provider/);
    const current = { ...original, promptbookVersion: ENGINE_VERSION };
    const normalized = canonicalizeConfig(current);
    assert.deepEqual(normalized.raw.server, migrated.raw.server);
    assert.deepEqual(normalized.raw.service, migrated.raw.service);
    assert.equal(normalized.corrections.length, 3);
    assert.doesNotMatch(JSON.stringify(normalized.corrections), /private-provider-reference|NEVER_CONTACT_PROVIDER/);
    assert.deepEqual(canonicalizeConfig(normalized.raw).corrections, [], 'normalization is idempotent');
    const aliases = canonicalizeConfig({ Server: { Tunnel: null, Port: 43123 }, Service: { QR: false, 'is-qr-shown': true, isPersistent: false } });
    assert.deepEqual(aliases.raw, { server: { port: 43123 }, service: { isPersistent: false } });
    const interpreted = interpretConfig(parseConfigText(JSON.stringify(current)), { cli: { 'server.tunnel.isEnabled': true, 'service.isQrShown': true } });
    assert.ok(!SETTING_SPECS.some((spec) => /tunnel|Qr/.test(spec.key)));
    assert.ok(!Object.keys(interpreted.values).some((key) => /tunnel|Qr/.test(key)), 'saved launch overrides have no effect');
});

test('older projects start locally with retired settings, one migration commit, no-server IPC controls and saved launch compatibility', async (t) => {
    const { project, env } = await initializedProject(t);
    const path = join(project, 'ptbk.json');
    const config = withRemoteSettings(JSON.parse(await readFile(path, 'utf8')));
    config.promptbookVersion = '0.119.0-34';
    await writeFile(path, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Old dashboard configuration', '--', 'ptbk.json']);
    const before = await readFile(path, 'utf8');
    const history = await subjects(project);
    const preview = await ptbk(['status', '--json'], { cwd: project, env });
    assert.equal(preview.code, 0, preview.output);
    assert.equal(await readFile(path, 'utf8'), before, 'inspection never writes migration');
    assert.deepEqual(await subjects(project), history);
    const started = await ptbk(['start', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const snapshot = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.deepEqual(snapshot.connection, { local: { state: 'disabled' } });
    assert.equal(snapshot.service.persistent, false);
    const saved = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(saved.promptbookVersion, ENGINE_VERSION);
    assert.deepEqual(saved.server, { isEnabled: false });
    assert.deepEqual(saved.service, { isPersistent: false });
    assert.deepEqual(saved.customDashboardData, { keep: true });
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0, 'local IPC works without HTTP');
    assert.equal((await ptbk(['resume', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['start', '--raw'], { cwd: project, env })).code, 0, 'repeated start reuses the engine');
    assert.equal((await ptbk(['stop', '-F', '--raw'], { cwd: project, env })).code, 0);
    const migrations = (await subjects(project)).filter((subject) => subject.startsWith('PTBK: Migrate configuration'));
    assert.equal(migrations.length, 1);
    assert.match(migrations[0], new RegExp(`0\\.119\\.0-34 to ${ENGINE_VERSION.replaceAll('.', '\\.')}`));
    const launchPath = join(project, '.ptbk', 'service', 'launch.json');
    const launch = JSON.parse(await readFile(launchPath, 'utf8'));
    launch.cli = { ...launch.cli, 'server.tunnel.isEnabled': true, 'server.tunnel.provider': 'cloudflare-named', 'service.isQrShown': true };
    await writeFile(launchPath, JSON.stringify(launch));
    const restored = await ptbk(['start', '--saved-launch', '--raw'], { cwd: project, env });
    assert.equal(restored.code, 0, restored.output);
    assert.deepEqual(JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout).connection, { local: { state: 'disabled' } });
    assert.equal((await ptbk(['stop', '-F', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await subjects(project)).filter((subject) => subject.startsWith('PTBK: Migrate configuration')).length, 1);
});

test('current projects retire stale dashboard settings through the existing scoped normalization coordinator once', async (t) => {
    const { project, env } = await initializedProject(t);
    const path = join(project, 'ptbk.json');
    const config = withRemoteSettings(JSON.parse(await readFile(path, 'utf8')));
    await writeFile(path, `${JSON.stringify(config, null, 4)}\n`);
    await git(project, ['commit', '-q', '-m', 'Stale dashboard configuration', '--', 'ptbk.json']);
    const outcome = await maintainProjectConfiguration(projectAt(project), { commit: true, env });
    assert.ok(outcome.normalized?.commit);
    assert.equal(outcome.migrated, undefined, 'equal versions do not get a version migration');
    assert.deepEqual((await maintainProjectConfiguration(projectAt(project), { commit: true, env })), {});
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')).server, { isEnabled: false });
    assert.deepEqual((await git(project, ['show', '--name-only', '--format=', 'HEAD'])).trim().split('\n'), ['ptbk.json']);
});

/**
 * Exercises the real HTTP transport separately from background scheduling and host resource availability.
 */
test('loopback HTTP boundary: local bootstrap and controls, rebinding/proxy rejection, and credentials expire on restart', async (t) => {
    const { request: httpRequest } = await import('node:http');
    const { startHttpServer } = await import('../dist/service/http.js');
    const snapshot = { project: { name: 'transport fixture' }, connection: { local: { state: 'ready' } } };
    const actions = [];
    const options = {
        agenda: { snapshot: () => snapshot },
        token: 'first-local-process-credential',
        control: async (action) => {
            actions.push(action);
            return { applied: true };
        },
    };
    let server = await startHttpServer(options);
    t.after(() => server.close());
    const requestStatus = (headers) => new Promise((resolve, reject) => {
        const request = httpRequest(`${server.url}api/session`, { headers: { 'X-PTBK-Client': 'dashboard', ...headers } }, (response) => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on('error', reject);
        request.end();
    });
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal((await fetch(`${server.url}api/session`)).status, 401);
    for (const headers of [{ Host: 'evil.example' }, { Origin: 'https://evil.example' }, { Origin: 'http://localhost:1' }, { 'X-Forwarded-Host': new URL(server.url).host }, { 'X-Forwarded-Proto': 'https' }, { Forwarded: 'for=127.0.0.1' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }]) {
        assert.equal(await requestStatus(headers), 409, JSON.stringify(headers));
    }
    const bootstrap = await fetch(`${server.url}api/session`, { headers: { 'X-PTBK-Client': 'dashboard', Origin: server.url.slice(0, -1) } });
    assert.equal(bootstrap.status, 200);
    assert.equal(bootstrap.headers.get('set-cookie'), null);
    const { csrf } = await bootstrap.json();
    const browserHeaders = { 'X-PTBK-CSRF': csrf, 'Content-Type': 'application/json' };
    const state = await fetch(`${server.url}api/state`, { headers: browserHeaders });
    assert.equal(state.status, 200);
    assert.equal(state.headers.get('cache-control'), 'no-store, private');
    assert.deepEqual(await state.json(), snapshot);
    const control = (headers) => fetch(`${server.url}api/control`, { method: 'POST', headers, body: JSON.stringify({ action: 'pause' }) });
    assert.equal((await control({ 'Content-Type': 'application/json' })).status, 401);
    assert.equal((await control({ ...browserHeaders, Origin: 'https://evil.example' })).status, 409);
    assert.deepEqual(actions, []);
    assert.equal((await control(browserHeaders)).status, 200);
    assert.deepEqual(actions, ['pause']);
    const apiHeaders = { Authorization: `Bearer ${options.token}` };
    assert.equal((await fetch(`${server.url}api/state`, { headers: apiHeaders })).status, 200);
    assert.equal((await fetch(`${server.url}api/state`, { headers: { ...apiHeaders, 'X-Forwarded-For': '127.0.0.1' } })).status, 409);
    for (const headers of [{ Cookie: 'ptbk_session=old-device' }, { Authorization: 'Bearer ptbk_old-remote-token' }, { 'X-PTBK-CSRF': 'wrong' }]) {
        assert.equal((await fetch(`${server.url}api/state`, { headers })).status, 401);
    }
    for (const path of ['api/pair', 'api/logout']) {
        assert.equal((await fetch(`${server.url}${path}`, { method: 'POST', headers: apiHeaders })).status, 404);
    }
    assert.equal((await fetch(`${server.url}api/qr`, { headers: apiHeaders })).status, 405);
    await server.close();
    server = await startHttpServer({ ...options, token: 'replacement-local-process-credential' });
    assert.equal((await fetch(`${server.url}api/state`, { headers: apiHeaders })).status, 401);
    assert.equal((await fetch(`${server.url}api/state`, { headers: browserHeaders })).status, 401);
});

test('local origin validation accepts default HTTP port spelling and still rejects a different listener', async () => {
    const { assertLocalRequest } = await import('../dist/service/auth.js');
    for (const host of ['127.0.0.1', 'localhost', '127.0.0.1:80', 'localhost:80']) {
        const request = { headers: { host, origin: `http://${host.replace(/:80$/, '')}` }, socket: { remoteAddress: '127.0.0.1' } };
        assert.doesNotThrow(() => assertLocalRequest(request, 80));
        assert.throws(() => assertLocalRequest(request, 3000), /direct same-origin local requests/);
    }
});
