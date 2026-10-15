import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { BIN, git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = "process.exit(0 + Number(require('node:fs').existsSync('BROKEN')));\n".replace('require', "(await import('node:module')).createRequire(import.meta.url)");

/**
 * Status snapshot of a project as JSON.
 */
async function status(project, env) {
    const result = await ptbk(['status', '--json'], { cwd: project, env });
    return JSON.parse(result.stdout);
}

test('daemon lifecycle: one service, repeated start reports it, add is executed via Manager, stop releases the project', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const started = await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.match(started.stdout, /^Started/, started.output);
    assert.doesNotMatch(started.stdout, /\x1b|[┌┐└┘╭╮]/, 'raw output without decoration');
    const first = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.service.state === 'running' ? snapshot : undefined;
    }, { message: 'the daemon to report running' });
    assert.equal(first.service.mode, 'daemon');
    assert.equal(first.connection.local.state, 'ready', JSON.stringify(first.connection));
    assert.equal(first.connection.remote.state, 'disabled');
    assert.equal(first.connection.pairing.code, undefined, 'snapshots never carry pairing secrets');
    const repeated = await ptbk(['start', '--raw'], { cwd: project, env });
    assert.match(repeated.stdout, /^Already running/, repeated.output);
    assert.equal((await status(project, env)).service.pid, first.service.pid);
    const record = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    assert.equal(record.pid, first.service.pid);
    await waitFor(async () => (await subjects(project)).includes('PTBK: Check that the project is ready for Promptbook work'), { message: 'the starter task to be committed' });
    const added = await ptbk(['add', 'Write the welcome page', '--raw'], { cwd: project, env });
    assert.match(added.stdout, /committed [0-9a-f]{8}/, added.output);
    await waitFor(async () => (await subjects(project)).includes('PTBK: Write the welcome page'), { timeoutMs: 90_000, message: 'the added task to be executed after Manager assignment' });
    const history = await subjects(project);
    assert.ok(history.indexOf('PTBK: Assign routing: Write the welcome page') > history.indexOf('PTBK: Write the welcome page'), 'assignment precedes its target');
    assert.ok(history.filter((subject) => subject !== 'Fixture check').every((subject) => subject.startsWith('PTBK: ') && !subject.startsWith('PTBK: PTBK:')));
    const stopped = await ptbk(['stop', '--after-task', '--raw'], { cwd: project, env });
    assert.equal(stopped.code, 0, stopped.output);
    assert.match(stopped.stdout, /^Stopped/, stopped.output);
    assert.equal((await status(project, env)).service.state, 'stopped');
    await assert.rejects(readFile(join(project, '.ptbk', 'service', 'process.json')));
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')));
    const launch = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8'));
    assert.equal(launch.intentionallyStopped, true);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    const dashboard = await ptbk(['dashboard', '--raw'], { cwd: project, env });
    assert.notEqual(dashboard.code, 0, 'dashboard never starts a service');
    assert.match(dashboard.stderr, /No ptbk service is running/);
});

test('HTTP API: no project data without pairing; single-use pairing; CSRF and origin checks on controls', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    const pairing = await ptbk(['access', 'pair', '--raw'], { cwd: project, env });
    const link = /(http:\/\/127\.0\.0\.1:\d+\/)#pair=([A-Za-z0-9_-]+)/.exec(pairing.stdout);
    assert.ok(link, pairing.output);
    const [, base, code] = link;
    assert.equal((await fetch(`${base}api/state`)).status, 401);
    const health = await (await fetch(`${base}api/health`)).json();
    assert.equal(health.service, 'ptbk');
    assert.equal(Object.keys(health).length, 2, 'health discloses nothing else');
    const shell = await fetch(base);
    assert.match(shell.headers.get('content-security-policy'), /default-src 'self'/);
    assert.doesNotMatch(await shell.text(), /my project/, 'the app shell contains no project data');
    const paired = await fetch(`${base}api/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    assert.equal(paired.status, 200);
    const cookie = paired.headers.get('set-cookie').split(';')[0];
    assert.match(paired.headers.get('set-cookie'), /HttpOnly/);
    const { csrf } = await paired.json();
    const reused = await fetch(`${base}api/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    assert.equal(reused.status, 401);
    const state = await fetch(`${base}api/state`, { headers: { cookie } });
    assert.equal(state.status, 200);
    assert.equal(state.headers.get('cache-control'), 'no-store, private');
    const snapshot = await state.json();
    assert.equal(snapshot.project.name, 'my project');
    const control = (headers) => fetch(`${base}api/control`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ action: 'pause' }) });
    assert.equal((await control({})).status, 409, 'missing CSRF token');
    assert.equal((await control({ 'X-PTBK-CSRF': csrf, Origin: 'https://evil.example' })).status, 409, 'cross-origin');
    const accepted = await control({ 'X-PTBK-CSRF': csrf, Origin: base.replace(/\/$/, '') });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).applied, true);
    await waitFor(async () => (await status(project, env)).service.state === 'paused' || (await status(project, env)).service.state === 'pausing', { message: 'pause visible in the CLI snapshot' });
    const token = /\n(ptbk_[A-Za-z0-9_-]+)\n/.exec((await ptbk(['access', 'token', 'ci', '--raw'], { cwd: project, env })).stdout)[1];
    const viaToken = await fetch(`${base}api/control`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }) });
    assert.equal(viaToken.status, 200);
    assert.equal((await ptbk(['access', 'revoke', '--all', '--raw'], { cwd: project, env })).code, 0);
    assert.equal((await fetch(`${base}api/state`, { headers: { cookie } })).status, 401, 'revoked device loses access');
});

test('attached raw dashboard observes the running service and leaving it does not stop the service', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    const child = spawn(process.execPath, [BIN, 'dashboard', '--raw'], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    await waitFor(() => output.includes('daemon for'), { message: 'dashboard output' });
    child.kill('SIGINT');
    await new Promise((resolve) => child.once('close', resolve));
    assert.equal((await status(project, env)).service.state, 'running');
});

test('stop interrupts owned work recoverably; the next start resumes it without repeating accepted work', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(async () => (await subjects(project)).includes('PTBK: Check that the project is ready for Promptbook work'), { message: 'the starter task' });
    const stopped = await ptbk(['stop', '--raw'], { cwd: project, env });
    assert.equal(stopped.code, 0, stopped.output);
    const record = await readFile(join(project, '.ptbk', 'state', 'active.json'), 'utf8').then(JSON.parse, () => undefined);
    const dirty = (await git(project, ['status', '--porcelain'])).trim();
    if (dirty) assert.ok(record, `uncommitted changes after stop must belong to a recovery record:\n${dirty}`);
    await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(async () => (await subjects(project)).some((subject) => subject.startsWith('PTBK: Learn from: Check that the project')), { message: 'the learning task to finish after restart' });
    await ptbk(['stop', '--after-task', '--raw'], { cwd: project, env });
    const learningTurns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => entry.learning);
    assert.ok(learningTurns.length <= 2, 'an interrupted turn may be redone once, never repeatedly');
    assert.equal((await subjects(project)).filter((subject) => subject.startsWith('PTBK: Learn from: Check that the project')).length, 1, 'one result commit');
});
