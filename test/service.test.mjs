import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { BIN, findGenerated, git, initializedProject, ptbk, subjects, waitFor } from './helpers.mjs';

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
    const started = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    assert.match(started.stdout, /^Started/, started.output);
    assert.doesNotMatch(started.stdout, /\x1b|[┌┐└┘╭╮]/, 'raw output without decoration');
    const first = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.service.state === 'running' ? snapshot : undefined;
    }, { message: 'the daemon to report running' });
    assert.equal(first.service.mode, 'daemon');
    assert.equal(first.connection.local.state, 'ready', JSON.stringify(first.connection));
    assert.deepEqual(Object.keys(first.connection), ['local'], 'only the local connection is advertised');
    assert.doesNotMatch(started.stdout, /Remote:|Pairing:|#pair=/);
    const repeated = await ptbk(['start', '--raw'], { cwd: project, env });
    assert.match(repeated.stdout, /^Already running/, repeated.output);
    assert.equal((await status(project, env)).service.pid, first.service.pid);
    const record = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    assert.equal(record.pid, first.service.pid);
    await waitFor(async () => findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), { message: 'the Expert bootstrap task to be committed' });
    const added = await ptbk(['add', 'Write the welcome page', '--raw'], { cwd: project, env });
    assert.match(added.stdout, /committed [0-9a-f]{8}/, added.output);
    await waitFor(async () => findGenerated(await subjects(project), 'Write the welcome page', 'ptbk: '), { timeoutMs: 90_000, message: 'the added task to be executed after Manager assignment' });
    const history = await subjects(project);
    const target = findGenerated(history, 'Write the welcome page', 'ptbk: ');
    const assignment = history.find((subject) => subject.startsWith(`ptbk: Assign routing: ${target.slice('ptbk: '.length)}`));
    assert.ok(assignment && history.indexOf(assignment) > history.indexOf(target), 'assignment precedes its target');
    assert.ok(history.filter((subject) => subject !== 'Fixture check').every((subject) => subject.startsWith('ptbk: ') && !subject.startsWith('ptbk: PTBK:')));
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

test('local HTTP dashboard and API: bootstrap, authenticated controls and loopback origin safeguards without a tunnel', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const started = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const { token, http } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const base = http.url;
    assert.match(base, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal((await fetch(`${base}api/state`)).status, 401);
    assert.deepEqual(await (await fetch(`${base}api/health`)).json(), { service: 'ptbk' });
    const shell = await fetch(base);
    assert.match(shell.headers.get('content-security-policy'), /default-src 'self'/);
    assert.doesNotMatch(await shell.text(), /my project/, 'the shell contains no project data');
    const bootstrapHeaders = { 'X-PTBK-Client': 'dashboard' };
    assert.equal((await fetch(`${base}api/session`)).status, 401, 'bootstrap requires a non-simple browser request');
    const session = await fetch(`${base}api/session`, { headers: bootstrapHeaders });
    assert.equal(session.status, 200);
    assert.equal(session.headers.get('set-cookie'), null, 'no persistent device session');
    const { csrf } = await session.json();
    const browserHeaders = { 'X-PTBK-CSRF': csrf };
    const state = await fetch(`${base}api/state`, { headers: browserHeaders });
    assert.equal(state.status, 200);
    assert.equal(state.headers.get('cache-control'), 'no-store, private');
    const snapshot = await state.json();
    assert.equal(snapshot.project.name, 'my project');
    assert.equal(typeof snapshot.attention, 'object');
    assert.equal(snapshot.health.status === 'unknown' || typeof snapshot.health.disk.freeMiB === 'number', true);
    assert.deepEqual(snapshot.service.pauseReasons, []);
    assert.deepEqual(Object.keys(snapshot.connection), ['local']);
    const sorted = await (await fetch(`${base}api/tasks?sort=name&descending=1`, { headers: browserHeaders })).json();
    assert.ok(Array.isArray(sorted.tasks));
    assert.deepEqual(sorted.tasks.map((task) => task.title), [...sorted.tasks.map((task) => task.title)].sort((a, b) => b.localeCompare(a)));
    assert.equal((await fetch(`${base}api/tasks?sort=bogus`, { headers: browserHeaders })).status, 400);
    // Filtering is a view over the complete inventory: `total` and `choices` always describe the unfiltered one.
    assert.equal(sorted.total, sorted.tasks.length);
    assert.ok(Array.isArray(sorted.choices.readiness) && Array.isArray(sorted.choices.agents));
    const none = await (await fetch(`${base}api/tasks?text=${encodeURIComponent('no task is called this')}`, { headers: browserHeaders })).json();
    assert.deepEqual([none.tasks, none.total], [[], sorted.tasks.length]);
    for (const readiness of sorted.choices.readiness) {
        const matching = await (await fetch(`${base}api/tasks?readiness=${encodeURIComponent(readiness)}`, { headers: browserHeaders })).json();
        assert.ok(matching.tasks.length > 0 && matching.tasks.every((task) => task.readiness === readiness), readiness);
    }
    assert.equal((await fetch(`${base}api/tasks?kind=bogus`, { headers: browserHeaders })).status, 400);
    const control = (headers) => fetch(`${base}api/control`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ action: 'pause' }) });
    assert.equal((await control({})).status, 401, 'missing local capability');
    assert.equal((await control({ 'X-PTBK-CSRF': 'wrong' })).status, 401);
    for (const headers of [
        { Origin: 'https://evil.example' },
        { Origin: base.replace('http:', 'https:').replace(/\/$/, '') },
        { 'X-Forwarded-Host': new URL(base).host },
        { 'X-Forwarded-Proto': 'https' },
        { Forwarded: 'for=127.0.0.1' },
        { 'Sec-Fetch-Site': 'cross-site' },
        { 'Sec-Fetch-Site': 'same-site' },
    ]) {
        assert.equal((await fetch(`${base}api/session`, { headers: { ...bootstrapHeaders, ...headers } })).status, 409, JSON.stringify(headers));
        assert.equal((await control({ ...browserHeaders, ...headers })).status, 409, JSON.stringify(headers));
        assert.equal((await fetch(`${base}api/state`, { headers: { Authorization: `Bearer ${token}`, ...headers } })).status, 409, 'bearer credentials never bypass the local boundary');
    }
    // Fetch replaces a supplied Host header on current Node versions; send a real rebinding request over HTTP.
    const reboundStatus = await new Promise((resolve, reject) => {
        const request = httpRequest(`${base}api/session`, { headers: { ...bootstrapHeaders, Host: 'evil.example' } }, (response) => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on('error', reject);
        request.end();
    });
    assert.equal(reboundStatus, 409, 'DNS rebinding Host is rejected before browser bootstrap');
    const accepted = await control({ ...browserHeaders, Origin: base.replace(/\/$/, '') });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).applied, true);
    await waitFor(async () => ['pause', 'pausing'].includes((await status(project, env)).service.state), { message: 'pause visible in the CLI snapshot' });
    const apiHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(`${base}api/control`, { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'resume' }) })).status, 200);
    const healthControl = (body) => fetch(`${base}api/control`, { method: 'POST', headers: apiHeaders, body: JSON.stringify(body) }).then((response) => response.json());
    const preview = await healthControl({ action: 'health-clean-cache' });
    assert.equal(preview.applied, false);
    assert.equal(preview.data.path, '.ptbk/tmp');
    assert.equal((await healthControl({ action: 'health-recheck' })).applied, true);
    assert.equal((await healthControl({ action: 'health-override' })).applied, false);
    for (const [path, method] of [['api/pair', 'POST'], ['api/logout', 'POST'], ['api/qr', 'GET']]) {
        assert.equal((await fetch(`${base}${path}`, { method, headers: apiHeaders })).status, method === 'GET' ? 405 : 404, `${path} is removed`);
    }
    assert.equal((await fetch(`${base}api/state`, { headers: { Cookie: 'ptbk_session=old-device' } })).status, 401, 'old device cookies have no authority');
    assert.equal((await fetch(`${base}api/state`, { headers: { Authorization: 'Bearer ptbk_old-token' } })).status, 401, 'old remote tokens have no authority');
    await assert.rejects(readFile(join(project, '.ptbk', 'auth', 'pairing.json')), 'startup does not create pairing state');
});

test('Book source editing over the API: problematic content saves with a warning and one Fixer repair pending under pause; stale revisions conflict', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const started = await ptbk(['start', '--no-persist', '--paused', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const { http } = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'process.json'), 'utf8'));
    const { csrf } = await (await fetch(`${http.url}api/session`, { headers: { 'X-PTBK-Client': 'dashboard' } })).json();
    const api = async (path, body) => {
        const response = await fetch(`${http.url}${path}`, {
            method: body ? 'POST' : 'GET',
            headers: { 'X-PTBK-Client': 'dashboard', 'X-PTBK-CSRF': csrf, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(30_000),
        });
        return { status: response.status, data: await response.json() };
    };
    const source = (await api(`api/books?ref=${encodeURIComponent('@Fixer')}`)).data;
    assert.equal(source.path, 'agents/.core/fixer.book');
    assert.equal(source.editable, true);
    assert.deepEqual(source.highlight[0], { line: 0, start: 0, end: 5, kind: 'declaration' }, 'the editor gets the shared highlighting ranges');
    const unsaved = await api('api/books/highlight', { text: 'AGENT Fixer\nRULE Ask @Writer.\n' });
    assert.deepEqual(unsaved.data.highlight.map((span) => span.kind), ['declaration', 'name', 'keyword', 'reference'], 'unsaved text is highlighted by the same parser');

    // An unknown commitment is a warning, never a refused or hanging save; Fixer gets one ordinary repair task.
    const text = `${source.text}FOOBAR something unknown\n`;
    const saved = await api('api/books', { path: source.path, text, revision: source.revision });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.saved, true);
    assert.ok(saved.data.diagnostics.length > 0);
    assert.equal(saved.data.repair, true);
    assert.equal(await readFile(join(project, source.path), 'utf8'), text, 'the exact saved source is kept');
    assert.ok((await subjects(project)).includes('ptbk: Edit agent - Fixer'));
    const repairs = await waitFor(async () => {
        const found = (await api('api/tasks')).data.tasks.filter((task) => /Project health check/.test(task.title));
        return found.length ? found : undefined;
    }, { timeoutMs: 20_000, message: 'the repair task in the inventory' });
    assert.equal(repairs.length, 1, 'one repair task');
    assert.notEqual(repairs[0].readiness, 'active', 'paused: the repair waits like other work');

    // A save based on the old revision is a conflict and writes nothing; an unchanged save creates no commit.
    const stale = await api('api/books', { path: source.path, text: `${text}RULE Late.\n`, revision: source.revision });
    assert.equal(stale.status, 409, JSON.stringify(stale.data));
    assert.equal(await readFile(join(project, source.path), 'utf8'), text);
    const commits = (await subjects(project)).length;
    const unchanged = await api('api/books', { path: source.path, text, revision: saved.data.revision });
    assert.equal(unchanged.data.unchanged, true);
    assert.equal((await subjects(project)).length, commits);

    // Later saves still publish (nothing stays locked) and the existing repair is not duplicated.
    const again = await api('api/books', { path: source.path, text: `${text}BARBAZ another unknown\n`, revision: saved.data.revision });
    assert.equal(again.status, 200, JSON.stringify(again.data));
    assert.equal(again.data.repair, false, 'Fixer already has the repair task');
    assert.equal((await api('api/tasks')).data.tasks.filter((task) => /Project health check/.test(task.title)).length, 1);
});

test('attached raw dashboard observes the running service and leaving it does not stop the service', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    const child = spawn(process.execPath, [BIN, 'dashboard', '--raw'], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
    await waitFor(() => output.includes('daemon for'), { message: 'dashboard output' });
    child.kill('SIGINT');
    await new Promise((resolve) => child.once('close', resolve));
    assert.equal((await status(project, env)).service.state, 'running');
});

test('force stop interrupts owned work recoverably; the next start resumes it without repeating accepted work', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(async () => findGenerated(await subjects(project), 'Write the welcome page', 'ptbk: '), { message: 'the added task' });
    const stopped = await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
    assert.equal(stopped.code, 0, stopped.output);
    assert.match(stopped.stdout, /^Force-stopped/, stopped.output);
    await assert.rejects(readFile(join(project, '.ptbk', 'lock.json')), 'the owner cleans up its own lock on an internal force stop');
    // Concurrent runs keep one recovery record each (`.ptbk/state/active/<run>.json`).
    const records = await readdir(join(project, '.ptbk', 'state', 'active')).catch(() => []);
    const dirty = (await git(project, ['status', '--porcelain'])).trim();
    if (dirty) assert.ok(records.some((name) => name.endsWith('.json')), `uncommitted changes after stop must belong to a recovery record:\n${dirty}`);
    await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    await waitFor(async () => (await subjects(project)).some((subject) => subject.startsWith('ptbk: Learn from: Write the welcome page')), { message: 'the learning task to finish after restart' });
    await ptbk(['stop', '--after-task', '--raw'], { cwd: project, env });
    const learningTurns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => entry.learning);
    assert.ok(learningTurns.length <= 2, 'an interrupted turn may be redone once, never repeatedly');
    assert.equal((await subjects(project)).filter((subject) => subject.startsWith('ptbk: Learn from: Write the welcome page')).length, 1, 'one result commit');
});

test('init starts the agenda automatically, returns without waiting, and an explicit init resumes after an intentional stop', async (t) => {
    const { project, env, init } = await initializedProject(t, { check: CHECK, start: true });
    assert.equal(init.code, 0, init.output);
    assert.match(init.stdout, /^Project ready · agenda running/m, init.output);
    assert.match(init.stdout, /Service: running in the background \(PID \d+\)/);
    assert.match(init.stdout, /Next: ptbk dashboard/);
    assert.doesNotMatch(init.stdout, /ptbk start \(/, 'a successful init never asks for another start');
    assert.equal((await status(project, env)).service.state === 'stopped', false, 'the service runs after init returned');
    await waitFor(async () => findGenerated(await subjects(project), 'Review the initialized project', 'ptbk: '), { message: 'the Expert bootstrap task, executed by the service' });
    const repeated = await ptbk(['init', '--non-interactive', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(repeated.code, 0, repeated.output);
    assert.match(repeated.stdout, /already running \(reused\)/, 'repeating init reuses the service');
    await ptbk(['stop', '--after-task', '--raw'], { cwd: project, env });
    assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, true);
    const again = await ptbk(['init', '--non-interactive', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(again.code, 0, again.output);
    assert.match(again.stdout, /Service: running in the background/, 'an explicit init performs an authorized start');
    assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, false);
    await ptbk(['stop', '--after-task', '--raw'], { cwd: project, env });
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

/**
 * Whether a PID still exists.
 */
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

test('force stop ends an unresponsive engine and every execution process it owns, and records the deliberate stop', { skip: process.platform === 'win32' && 'SIGSTOP simulates an unresponsive engine on POSIX only' }, async (t) => {
    const { project, env: baseEnv } = await initializedProject(t, { check: CHECK });
    const env = { ...baseEnv, FAKE_CODEX_SLOW_MS: '60000' };
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--raw'], { cwd: project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const running = await waitFor(async () => {
        const snapshot = await status(project, env);
        return snapshot.current?.taskTitle.startsWith('Slow work') && snapshot.current.phase === 'executing' ? snapshot : undefined;
    }, { message: 'the slow task to execute' });
    const harness = await waitFor(async () => {
        const ledger = JSON.parse(await readFile(join(project, '.ptbk', 'service', 'owned.json'), 'utf8').catch(() => '{"processes":[]}'));
        return ledger.processes.find((owned) => /codex/.test(owned.label));
    }, { message: 'the harness to be recorded as owned' });
    assert.ok(alive(harness.pid));
    // The engine stops answering (its process is frozen), while its harness keeps working.
    process.kill(running.service.pid, 'SIGSTOP');
    t.after(() => {
        if (alive(running.service.pid)) process.kill(running.service.pid, 'SIGKILL');
    });
    const forced = await ptbk(['stop', '-F', '--raw'], { cwd: project, env, timeoutMs: 60_000 });
    assert.equal(forced.code, 0, forced.output);
    assert.match(forced.stdout, /^Force-stopped/, forced.output);
    assert.match(forced.stdout, /terminated; its cleanup is not guaranteed/, 'an engine that had to be killed is reported truthfully');
    assert.equal(alive(running.service.pid), false, 'the unresponsive engine was terminated');
    await waitFor(() => !alive(harness.pid), { timeoutMs: 5000, message: 'the owned harness to end' });
    assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, true, 'the deliberate stop suppresses automatic startup');
    assert.equal((await status(project, env)).service.state, 'stopped');
    const restarted = await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(restarted.code, 0, `an explicit start works after an uncatchable kill:\n${restarted.output}`);
    await ptbk(['stop', '-F', '--raw'], { cwd: project, env });
});

test('panic force-stops every active engine and its owned execution, keeps them registered as stopped, and never prompts without --yes', async (t) => {
    const first = await initializedProject(t, { check: CHECK });
    const second = await initializedProject(t, { check: CHECK });
    // Both projects belong to one OS user's host registry.
    const env = { ...first.env, FAKE_CODEX_SLOW_MS: '60000' };
    const secondEnv = { ...second.env, PTBK_HOME: env.PTBK_HOME };
    await ptbk(['add', 'Slow work SLOW_WORK', '--agent', 'Developer', '--raw'], { cwd: first.project, env });
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: first.project, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-server', '--no-persist', '--raw'], { cwd: second.project, env: secondEnv })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: second.project, env: secondEnv })).code, 0);
    const busy = await waitFor(async () => {
        const snapshot = await status(first.project, env);
        return snapshot.current?.phase === 'executing' ? snapshot : undefined;
    }, { message: 'the slow task to execute' });
    const harness = await waitFor(async () => JSON.parse(await readFile(join(first.project, '.ptbk', 'service', 'owned.json'), 'utf8').catch(() => '{"processes":[]}')).processes.find((owned) => /codex/.test(owned.label)), { message: 'the owned harness' });
    const paused = await status(second.project, secondEnv);
    assert.ok(['pausing', 'pause'].includes(paused.service.state), 'a paused (or still draining) engine');
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    t.after(() => unrelated.kill('SIGKILL'));

    for (const args of [['panic', '--soft'], ['panic', '--pause'], ['panic', '--path', first.project]]) {
        const rejected = await ptbk([...args, '--raw'], { cwd: first.directory, env });
        assert.equal(rejected.code, 2, `${args.join(' ')}: ${rejected.output}`);
    }
    const unconfirmed = await ptbk(['panic', '--raw'], { cwd: first.directory, env });
    assert.equal(unconfirmed.code, 2, unconfirmed.output);
    assert.match(unconfirmed.output, /--yes/);
    assert.equal((await status(first.project, env)).service.state, 'running', 'without --yes and without a terminal nothing changes');

    const result = await ptbk(['panic', '--yes', '--raw'], { cwd: first.directory, env, timeoutMs: 90_000 });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /Panic: 2 terminated\./, result.output);
    assert.equal(alive(busy.service.pid), false);
    assert.equal(alive(paused.service.pid), false, 'a paused engine is a target too');
    await waitFor(() => !alive(harness.pid), { timeoutMs: 5000, message: 'the owned harness to end' });
    assert.equal(alive(unrelated.pid), true, 'unrelated Node processes survive');
    for (const project of [first.project, second.project]) {
        assert.equal(JSON.parse(await readFile(join(project, '.ptbk', 'service', 'launch.json'), 'utf8')).intentionallyStopped, true, `${project}: deliberate stop suppresses automatic startup`);
    }
    const { readKnownProjects } = await import('../dist/service/known-projects.js');
    const known = (await readKnownProjects(env)).entries;
    assert.deepEqual(known.map((entry) => entry.projectRoot).sort(), [first.project, second.project].sort(), 'both stay registered');
    assert.ok(known.every((entry) => entry.lastRun?.outcome === 'force-stopped'), 'their last run is recorded as force-stopped');
    const again = await ptbk(['panic', '--yes', '--raw'], { cwd: first.directory, env });
    assert.equal(again.code, 0, again.output);
    assert.match(again.stdout, /No active Promptbook engines/, 'no active engines is a successful zero-target result');
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: first.project, env })).code, 0, 'an explicit start works again');
    await ptbk(['stop', '-F', '--raw'], { cwd: first.project, env });
    for (const project of [first.project, second.project]) assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'panic creates no project commits');
});
