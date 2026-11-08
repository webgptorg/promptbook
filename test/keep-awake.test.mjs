import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { chmod, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { macAssertionHeld, parseMacLid, parseMacPowerSource, parseWindowsPowerStatus, readLinuxPowerSupplies } from '../dist/power/adapters.js';
import { KeepAwake, keepAwakeHandoffPath } from '../dist/power/keep-awake.js';
import { lidHelperScript, lidInstallScript, lidRemoveScript, lidSudoersRule } from '../dist/power/mac-lid-helper.js';
import { KEEP_AWAKE_LIMITED_MS, effectiveKeepAwakeMode, parseKeepAwakeMode, readKeepAwakePreference, saveKeepAwakePreference } from '../dist/power/preference.js';
import { projectAt } from '../dist/project/workspace.js';
import { observeHost } from '../dist/ui/global-dashboard.js';
import { initializedProject, ptbk, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Waits a little.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Whether a process is alive.
 */
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

test('keep-awake preference: host-local per canonical project, Off by default, limited sessions end at an absolute time', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk keep-awake preference');
    const env = { ...process.env, PTBK_HOME: join(directory, 'home') };
    const project = join(directory, 'project');
    const clone = join(directory, 'clone');
    await mkdir(project);
    await mkdir(clone);
    assert.equal((await readKeepAwakePreference(project, env)).mode, 'off', 'a project without a choice starts Off');
    const start = Date.parse('2026-11-08T10:00:00Z');
    const limited = await saveKeepAwakePreference(project, { mode: 'limited' }, env, start);
    assert.equal(limited.expiresAt, new Date(start + KEEP_AWAKE_LIMITED_MS).toISOString());
    assert.equal(effectiveKeepAwakeMode(limited, start + KEEP_AWAKE_LIMITED_MS - 1), 'limited');
    assert.equal(effectiveKeepAwakeMode(limited, start + KEEP_AWAKE_LIMITED_MS), 'off', 'the session ends exactly at its saved end');
    // Changing only the closed-lid choice keeps the running session's end (nothing extends it).
    const lid = await saveKeepAwakePreference(project, { closedLid: true }, env, start + 60_000);
    assert.equal(lid.expiresAt, limited.expiresAt);
    assert.equal(lid.closedLid, true);
    assert.equal((await readKeepAwakePreference(join(project, '.'), env)).mode, 'limited', 'another spelling of the same directory is the same project');
    assert.equal((await readKeepAwakePreference(clone, env)).mode, 'off', 'a clone at another path does not inherit it');
    assert.equal((await readKeepAwakePreference(project, { ...env, PTBK_HOME: join(directory, 'other user') })).mode, 'off', 'another OS user (application data) does not inherit it');
    const always = await saveKeepAwakePreference(project, { mode: 'always' }, env, start);
    assert.equal(always.expiresAt, undefined);
    assert.equal(effectiveKeepAwakeMode(always, start + 365 * 24 * 3_600_000), 'always', 'inactivity never expires the persistent mode');
    const files = await readdir(join(directory, 'home', 'keep-awake'));
    assert.ok(files.length >= 1);
    await assert.rejects(readFile(join(project, '.ptbk', 'keep-awake.json')), 'nothing is stored in the project');
    assert.deepEqual(['2h', 'on', 'OFF', 'always', 'nonsense'].map(parseKeepAwakeMode), ['limited', 'always', 'off', 'always', undefined]);
});

test('keep-awake adapters parse what macOS, Windows and Linux report, and never invent external power', async (t) => {
    assert.deepEqual(parseMacPowerSource("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t80%; charging; 1:42 remaining present: true\n"), { source: 'external', detail: 'AC Power · 80%; charging; 1:42 remaining' });
    assert.equal(parseMacPowerSource("Now drawing from 'Battery Power'\n").source, 'battery');
    assert.equal(parseMacPowerSource("Now drawing from 'UPS Power'\n").source, 'battery', 'a UPS is not external power');
    assert.equal(parseMacPowerSource('').source, 'unknown');
    const assertions = '   pid 73180(caffeinate): [0x0008] 00:00:00 PreventUserIdleSystemSleep named: "caffeinate command-line tool"\n\tDetails: caffeinate asserting on behalf of Process ID 73179\n';
    assert.equal(macAssertionHeld(assertions, 73180), true);
    assert.equal(macAssertionHeld(assertions, 7318), false, 'another PID never matches by prefix');
    assert.deepEqual(parseMacLid('  |   "AppleClamshellCausesSleep" = No\n  |   "AppleClamshellState" = Yes\n', ' SleepDisabled\t\t1\n'), { hasLid: true, lidClosed: true, sleepsOnClose: false, sleepDisabled: true });
    assert.deepEqual(parseMacLid('', ' SleepDisabled\t\t0\n'), { hasLid: false, lidClosed: undefined, sleepsOnClose: undefined, sleepDisabled: false }, 'a Mac without a lid');
    assert.equal(parseWindowsPowerStatus('Online|High|97').source, 'external');
    assert.equal(parseWindowsPowerStatus('Offline|Low|20').source, 'battery');
    assert.equal(parseWindowsPowerStatus('Unknown|Unknown|255').source, 'unknown');
    const sys = await temporaryDirectory(t, 'ptbk power supplies');
    assert.equal((await readLinuxPowerSupplies(sys)).source, 'unknown', 'a server or VM reports no supply, so nothing is enabled');
    await mkdir(join(sys, 'AC'));
    await writeFile(join(sys, 'AC', 'type'), 'Mains\n');
    await writeFile(join(sys, 'AC', 'online'), '0\n');
    await mkdir(join(sys, 'BAT0'));
    await writeFile(join(sys, 'BAT0', 'type'), 'Battery\n');
    await writeFile(join(sys, 'BAT0', 'status'), 'Discharging\n');
    await writeFile(join(sys, 'BAT0', 'capacity'), '64\n');
    assert.equal((await readLinuxPowerSupplies(sys)).source, 'battery');
    await writeFile(join(sys, 'AC', 'online'), '1\n');
    assert.deepEqual(await readLinuxPowerSupplies(sys), { source: 'external', detail: 'External power · battery 64% discharging' });
});

/**
 * Runs the closed-lid helper script against a fake `pmset` and a temporary state directory.
 */
async function fakeLidHost(t) {
    const directory = await temporaryDirectory(t, 'ptbk lid helper');
    const value = join(directory, 'sleep-disabled');
    const pmset = join(directory, 'pmset');
    await writeFile(value, '0');
    await writeFile(pmset, `#!/bin/sh\nif [ "$1" = "-g" ]; then printf ' SleepDisabled\\t\\t%s\\n' "$(cat '${value}')"; exit 0; fi\nif [ "$1" = "-a" ] && [ "$2" = "disablesleep" ]; then printf '%s' "$3" > '${value}'; exit 0; fi\nexit 2\n`);
    await chmod(pmset, 0o755);
    // The real file name: holds are recognized by the helper's own command line.
    const helper = join(directory, 'io.ptbk.keep-awake');
    await writeFile(helper, lidHelperScript({ pmset, state: join(directory, 'state') }));
    await chmod(helper, 0o755);
    const read = async () => (await readFile(value, 'utf8')).trim();
    const set = async (next) => await writeFile(value, next);
    const hold = async () => {
        const child = spawn('/bin/sh', [helper, 'hold'], { stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
        await waitFor(async () => output.includes('held') || output.includes('failed'), { timeoutMs: 10_000, intervalMs: 20, message: 'the helper hold' });
        assert.match(output, /held/);
        const exited = new Promise((resolve) => child.once('exit', resolve));
        return { child, end: async () => (child.stdin.end(), await exited), exited };
    };
    const run = (operation) => execFileSync('/bin/sh', [helper, operation], { encoding: 'utf8' });
    return { read, set, hold, run, owned: () => readFile(join(directory, 'state', 'owned')).then(() => true, () => false) };
}

test('closed-lid helper: holds SleepDisabled while any hold lasts, restores it after the last, and never undoes the operator', { skip: process.platform === 'win32', timeout: 60_000 }, async (t) => {
    const host = await fakeLidHost(t);
    const first = await host.hold();
    assert.equal(await host.read(), '1');
    assert.equal(await host.owned(), true, 'the helper records that it changed the setting');
    const second = await host.hold();
    await first.end();
    assert.equal(await host.read(), '1', 'another hold keeps it');
    await second.end();
    assert.equal(await host.read(), '0', 'the last hold restores the previous value');
    assert.equal(await host.owned(), false);
    // A holder that is killed outright cannot release; the next boot (or hold) prunes it and restores.
    const killed = await host.hold();
    killed.child.kill('SIGKILL');
    await killed.exited;
    killed.child.stdin.end();
    assert.equal(await host.read(), '1');
    host.run('boot');
    assert.equal(await host.read(), '0', 'boot restores a setting a dead holder left behind');
    // A SleepDisabled the operator set before is never turned off.
    await host.set('1');
    const theirs = await host.hold();
    assert.equal(await host.owned(), false);
    await theirs.end();
    assert.equal(await host.read(), '1');
    // An operator change meanwhile is kept, too.
    await host.set('0');
    const changed = await host.hold();
    await host.set('0');
    await changed.end();
    assert.equal(await host.read(), '0');
    assert.equal(await host.owned(), false);
    assert.match(host.run('status'), /^version 1\nsleepDisabled 0\nowned no\n$/);
});

test('closed-lid helper installation embeds the exact helper, validates its sudo rule and parses as shell', { skip: process.platform === 'win32' }, () => {
    const install = lidInstallScript('alice');
    assert.ok(install.includes(lidHelperScript()), 'the installed helper is exactly the verified one');
    assert.ok(install.includes(lidSudoersRule('alice')));
    assert.match(lidSudoersRule('alice'), /^alice ALL = \(root\) NOPASSWD: \/Library\/PrivilegedHelperTools\/io\.ptbk\.keep-awake hold, \/Library\/PrivilegedHelperTools\/io\.ptbk\.keep-awake status$/m);
    assert.match(install, /visudo -cf/, 'the rule is validated before it is installed');
    assert.doesNotMatch(install, /> ?\/etc\/sudoers\b/, '/etc/sudoers itself is never edited');
    assert.throws(() => lidSudoersRule('bad user'), /cannot be used/);
    assert.throws(() => lidSudoersRule('ALL, root'), /cannot be used/);
    for (const script of [install, lidRemoveScript(), lidHelperScript()]) execFileSync('/bin/sh', ['-n', '-c', script]);
});

/**
 * An in-memory adapter whose requests can be slowed down, refused or lost.
 */
function memoryAdapter() {
    const state = { source: 'external', lid: 'unavailable', holds: new Map(), carried: [], delay: 0, fail: undefined, sequence: 0, ends: new Map() };
    const adapter = {
        platform: 'Memory',
        pollMs: 40,
        host: async () => ({ model: 'Memory1,1' }),
        readPower: async () => ({ source: state.source }),
        idleCapability: async () => ({ state: 'available' }),
        lidCapability: async () => (state.lid === 'available' ? { state: 'available', validation: { validated: false, text: 'memory' } } : { state: state.lid, reason: 'Closing the lid follows the memory lid policy.' }),
        observeLid: async () => undefined,
        hold: async (kind) => {
            if (state.fail) throw new Error(state.fail);
            await sleep(state.delay);
            const id = ++state.sequence;
            let end;
            const ended = new Promise((resolve) => (end = resolve));
            state.holds.set(id, kind);
            state.ends.set(id, end);
            return {
                kind,
                ended,
                release: async () => {
                    state.holds.delete(id);
                    end('released');
                },
            };
        },
        carry: async (kinds) => {
            state.carried.push([...kinds]);
            return [];
        },
        carryProblem: async () => state.carryProblem,
    };
    const kinds = () => [...state.holds.values()].sort();
    return { state, adapter, kinds };
}

/**
 * A controller with mutable engine facts.
 */
async function controller(t, options = {}) {
    const directory = await temporaryDirectory(t, 'ptbk keep-awake controller');
    await mkdir(join(directory, 'project', '.ptbk', 'service'), { recursive: true });
    const project = projectAt(join(directory, 'project'));
    const env = { ...process.env, PTBK_HOME: join(directory, 'home') };
    const memory = memoryAdapter();
    const facts = { state: 'running', forced: false, restarting: false, working: false, ...options.facts };
    const logs = [];
    let clock = options.now;
    const keepAwake = new KeepAwake({ project, instanceId: 'test-instance', env, adapter: memory.adapter, facts: () => facts, onChange: () => undefined, log: (text) => logs.push(text), ...(clock ? { now: () => clock } : {}) });
    t.after(async () => await keepAwake.stop());
    return { keepAwake, memory, facts, logs, project, env, tick: (ms) => (clock += ms), settle: async (condition, message) => await waitFor(async () => condition(), { timeoutMs: 5000, intervalMs: 20, message }) };
}

test('keep awake follows the engine lifecycle: running holds, pausing keeps, completed pause releases, resume reacquires', async (t) => {
    const { keepAwake, memory, facts, settle } = await controller(t);
    await keepAwake.start();
    await sleep(100);
    assert.deepEqual(memory.kinds(), [], 'Off by default: nothing is requested');
    assert.equal(keepAwake.view().idle.reason.code, 'off');
    const view = await keepAwake.set({ mode: 'always' });
    assert.equal(view.mode, 'always');
    assert.deepEqual(memory.kinds(), ['idle']);
    assert.equal(keepAwake.view().idle.state, 'active');
    assert.equal(keepAwake.view().holding, true);
    assert.equal(keepAwake.view().lid.state, 'os-policy', 'the lid is shown separately and follows the OS policy');
    facts.state = 'pausing';
    keepAwake.observe();
    await sleep(80);
    assert.deepEqual(memory.kinds(), ['idle'], 'an existing request covers checkpointing while pausing');
    facts.state = 'pause';
    keepAwake.observe();
    await settle(() => memory.kinds().length === 0, 'completed pause to release');
    assert.equal(keepAwake.view().idle.reason.code, 'paused');
    assert.equal(keepAwake.view().mode, 'always', 'the saved choice is kept');
    facts.state = 'running';
    keepAwake.observe();
    await settle(() => memory.kinds().length === 1, 'resume to reacquire');
    // A stop that starts while not holding acquires nothing new.
    facts.state = 'stopping';
    keepAwake.observe();
    await sleep(80);
    assert.deepEqual(memory.kinds(), ['idle'], 'stopping keeps an existing request until it completes');
    facts.forced = true;
    keepAwake.observe();
    await settle(() => memory.kinds().length === 0, 'force stop to revoke during the transition');
});

test('keep awake needs external power: battery releases and keeps the mode, external power reacquires', async (t) => {
    const { keepAwake, memory, settle } = await controller(t);
    await keepAwake.start();
    await keepAwake.set({ mode: 'always' });
    assert.deepEqual(memory.kinds(), ['idle']);
    memory.state.source = 'battery';
    await settle(() => memory.kinds().length === 0, 'unplugging to release');
    assert.equal(keepAwake.view().idle.reason.code, 'battery');
    assert.equal(keepAwake.view().mode, 'always');
    memory.state.source = 'unknown';
    await sleep(120);
    assert.equal(keepAwake.view().idle.reason.code, 'power-unknown', 'a missing reading is not external power');
    memory.state.source = 'external';
    await settle(() => memory.kinds().length === 1, 'external power to reacquire');
});

test('keep awake never keeps a request the OS confirmed after it was revoked', async (t) => {
    const { keepAwake, memory, facts, settle } = await controller(t);
    await keepAwake.start();
    memory.state.delay = 300;
    const enabling = keepAwake.set({ mode: 'always' });
    await sleep(100);
    await keepAwake.set({ mode: 'off' });
    await enabling;
    await sleep(400);
    assert.deepEqual(memory.kinds(), [], 'turning it off wins over the late confirmation');
    const again = keepAwake.set({ mode: 'always' });
    await sleep(100);
    facts.state = 'pause';
    keepAwake.observe();
    await again;
    await sleep(400);
    assert.deepEqual(memory.kinds(), [], 'a completed pause wins over the late confirmation');
    memory.state.delay = 0;
    facts.state = 'running';
    keepAwake.observe();
    await settle(() => memory.kinds().length === 1, 'resume');
});

test('a paused start acquires nothing; a lost request is reported and tried again', async (t) => {
    const { keepAwake, memory, facts, settle, project, env } = await controller(t, { facts: { state: 'pause' } });
    await saveKeepAwakePreference(project.root, { mode: 'always' }, env);
    await keepAwake.start();
    await sleep(150);
    assert.deepEqual(memory.kinds(), [], 'an engine restored paused holds no protection');
    assert.equal(keepAwake.view().idle.reason.code, 'paused');
    facts.state = 'running';
    keepAwake.observe();
    await settle(() => memory.kinds().length === 1, 'running to acquire');
    const [id] = memory.state.holds.keys();
    memory.state.holds.delete(id);
    memory.state.ends.get(id)('caffeinate ended (SIGKILL)');
    await settle(() => keepAwake.view().idle.state === 'degraded', 'the lost request to be reported');
    assert.match(keepAwake.view().idle.reason.text, /ended unexpectedly/);
    memory.state.fail = 'refused by the fixture';
    assert.equal(keepAwake.view().holding, false);
});

test('a limited session ends at its saved time and shows Off; work time is reported passively', async (t) => {
    const start = Date.now();
    const { keepAwake, memory, facts, tick, settle, project, env } = await controller(t, { now: start });
    await keepAwake.start();
    await keepAwake.set({ mode: 'limited' });
    assert.deepEqual(memory.kinds(), ['idle']);
    assert.equal(keepAwake.view().expiresAt, new Date(start + KEEP_AWAKE_LIMITED_MS).toISOString());
    assert.equal(keepAwake.view().lastWorkAt, undefined, 'no activity is known yet');
    facts.working = true;
    keepAwake.observe();
    assert.ok(keepAwake.view().lastWorkAt);
    facts.working = false;
    keepAwake.observe();
    tick(KEEP_AWAKE_LIMITED_MS + 1000);
    await settle(() => memory.kinds().length === 0, 'expiry to release');
    assert.equal(keepAwake.view().mode, 'off');
    assert.equal((await readKeepAwakePreference(project.root, env)).mode, 'off', 'Off is saved, so a restart cannot extend the session');
});

test('a restart carries held protection to the replacement; an update waits when the closed lid could not be carried', async (t) => {
    const { keepAwake, memory, facts, settle } = await controller(t);
    memory.state.lid = 'available';
    await keepAwake.start();
    await keepAwake.set({ mode: 'always', closedLid: true });
    await settle(() => memory.kinds().length === 2, 'idle and closed-lid requests');
    assert.equal(keepAwake.view().lid.state, 'active');
    assert.equal(await keepAwake.handoffProblem(), undefined);
    memory.state.carryProblem = 'the helper was revoked';
    assert.equal(await keepAwake.handoffProblem(), 'the helper was revoked', 'an update defers with the reason');
    memory.state.carryProblem = undefined;
    facts.restarting = true;
    facts.state = 'stopped';
    keepAwake.observe();
    await sleep(100);
    assert.equal(memory.kinds().length, 2, 'a restarting engine keeps its requests until the handoff');
    await keepAwake.handOff();
    assert.deepEqual(memory.state.carried, [['idle', 'lid']]);
    assert.deepEqual(memory.kinds(), [], 'the carriers hold it now; the old engine released its own');
});

/**
 * Live requests of the process-backed fixture adapter (a request ends with its process).
 */
async function liveHolds(directory) {
    const names = await readdir(join(directory, 'holds')).catch(() => []);
    const holds = [];
    for (const name of names) {
        const hold = JSON.parse(await readFile(join(directory, 'holds', name), 'utf8').catch(() => '{}'));
        if (hold.pid && alive(hold.pid)) holds.push(hold);
    }
    return holds;
}

/**
 * Status snapshot of a project.
 */
async function status(project, env) {
    const result = await ptbk(['status', '--json'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    return JSON.parse(result.stdout);
}

test('engines own their keep-awake requests across pause, stop, power loss, abrupt loss, paused start and restart', { timeout: 300_000 }, async (t) => {
    const first = await initializedProject(t);
    const second = await initializedProject(t);
    const power = await temporaryDirectory(t, 'ptbk fake power');
    await writeFile(join(power, 'power.json'), JSON.stringify({ source: 'external' }));
    // One host: both projects share the OS user's application data and the fixture's power source.
    const env = { ...first.env, PTBK_POWER_ADAPTER: 'fake', PTBK_POWER_FAKE: power, PTBK_POWER_FAKE_POLL_MS: '300' };
    const a = first.project;
    const b = second.project;
    const holdsOf = async (project) => {
        const pid = (await status(project, env)).service.pid;
        return (await liveHolds(power)).filter((hold) => hold.parent === pid);
    };
    // A stopped project's choice is saved directly and applies when its engine runs.
    const saved = await ptbk(['keep-awake', 'always', '--json', '--path', a], { cwd: a, env });
    assert.equal(saved.code, 0, saved.output);
    assert.equal(JSON.parse(saved.stdout).engine, 'stopped');
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: a, env })).code, 0);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: b, env })).code, 0);
    await waitFor(async () => (await holdsOf(a)).length === 1, { message: 'the first engine to restore its saved choice' });
    assert.equal((await holdsOf(b)).length, 0, 'the second engine is Off by default');
    const shown = await ptbk(['keep-awake', '--raw', '--path', a], { cwd: a, env });
    assert.match(shown.stdout, /Keep awake: Always on external power/);
    assert.match(shown.stdout, /Idle sleep: active/);
    const enabled = JSON.parse((await ptbk(['keep-awake', 'always', '--json'], { cwd: b, env })).stdout);
    assert.equal(enabled.holding, true);
    assert.equal(enabled.engine, 'running');
    assert.equal((await holdsOf(b)).length, 1);
    // The global view reports verified requests of live engines.
    const host = await observeHost(env);
    assert.deepEqual(host.rows.filter((row) => row.keepAwake).map((row) => row.projectRoot).sort(), [a, b].map((root) => projectAt(root).root).sort());
    // Pause one: completed Pause releases its request; the other keeps the host awake.
    assert.equal((await ptbk(['pause', '--raw'], { cwd: a, env })).code, 0);
    await waitFor(async () => (await holdsOf(a)).length === 0, { message: 'completed pause to release' });
    assert.equal((await status(a, env)).keepAwake.idle.reason.code, 'paused');
    assert.equal((await holdsOf(b)).length, 1, 'the second engine still keeps the host awake');
    // Changing the mode while paused acquires nothing until the engine runs.
    assert.equal(JSON.parse((await ptbk(['keep-awake', 'limited', '--json'], { cwd: a, env })).stdout).holding, false);
    assert.equal((await ptbk(['resume', '--raw'], { cwd: a, env })).code, 0);
    await waitFor(async () => (await holdsOf(a)).length === 1, { message: 'resume to reacquire' });
    // Disable the second one, then stop it.
    assert.equal(JSON.parse((await ptbk(['keep-awake', 'off', '--json'], { cwd: b, env })).stdout).holding, false);
    assert.equal((await holdsOf(b)).length, 0);
    await ptbk(['keep-awake', 'always', '--json'], { cwd: b, env });
    const bPid = (await status(b, env)).service.pid;
    assert.equal((await ptbk(['stop', '--raw'], { cwd: b, env })).code, 0);
    await waitFor(async () => !(await liveHolds(power)).some((hold) => hold.parent === bPid), { message: 'stop to release' });
    // Unplug: the request is released and the mode kept; plug in again: it is reapplied.
    await writeFile(join(power, 'power.json'), JSON.stringify({ source: 'battery' }));
    await waitFor(async () => (await holdsOf(a)).length === 0, { message: 'battery to release' });
    const unplugged = await status(a, env);
    assert.equal(unplugged.keepAwake.idle.reason.code, 'battery');
    assert.equal(unplugged.keepAwake.mode, 'limited');
    await writeFile(join(power, 'power.json'), JSON.stringify({ source: 'external' }));
    await waitFor(async () => (await holdsOf(a)).length === 1, { message: 'external power to reacquire' });
    // A restart carries protection without a gap; the replacement takes it over and ends the carrier.
    const before = (await status(a, env)).service;
    let gaps = 0;
    let watching = true;
    const watcher = (async () => {
        while (watching) {
            if (!(await liveHolds(power)).length) gaps++;
            await sleep(25);
        }
    })();
    const restarted = await ptbk(['restart', '--raw'], { cwd: a, env });
    assert.equal(restarted.code, 0, restarted.output);
    await waitFor(async () => {
        const after = await status(a, env);
        const holds = await liveHolds(power);
        return after.service.instanceId !== before.instanceId && holds.length === 1 && holds[0].parent === after.service.pid && !holds[0].carrier;
    }, { message: 'the replacement to hold protection itself' });
    watching = false;
    await watcher;
    assert.equal(gaps, 0, 'protection never lapsed during the restart');
    await assert.rejects(readFile(keepAwakeHandoffPath(projectAt(a))), 'the handoff ended');
    // Abrupt loss: a killed engine's request ends with it (no orphan).
    const killedPid = (await status(a, env)).service.pid;
    process.kill(killedPid, 'SIGKILL');
    await waitFor(async () => !(await liveHolds(power)).length, { message: 'the killed engine’s request to end' });
    await waitFor(async () => !alive(killedPid), { message: 'the engine to end' });
    await ptbk(['stop', '--force', '--raw'], { cwd: a, env });
    // Started directly paused: the saved choice is restored, but nothing is requested.
    assert.equal((await ptbk(['start', '--paused', '--no-persist', '--raw'], { cwd: a, env })).code, 0);
    await sleep(1500);
    const paused = await status(a, env);
    assert.equal(paused.keepAwake.mode, 'limited');
    assert.equal(paused.keepAwake.holding, false);
    assert.equal((await holdsOf(a)).length, 0);
    await ptbk(['stop', '--force', '--raw'], { cwd: a, env });
    await rm(join(power, 'holds'), { recursive: true, force: true });
});
