import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, open, readFile, readdir, rm, stat, truncate, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { ComputerControl } from '../dist/computer/session.js';
import { computerDirectory, desktopExclusive, desktopProtectionReason, protectDesktop } from '../dist/computer/protection.js';
import { recordComputerScreenshot } from '../dist/computer/recording.js';
import { runtimePaths } from '../dist/project/workspace.js';
import { temporaryDirectory } from './helpers.mjs';

/** Native boundary fixture: no real screen/input is accessed, and active work obeys the passed AbortSignal. */
class Backend {
    calls = [];
    listeners = new Set();
    releases = 0;
    closed = false;
    state = { platform: process.platform, supported: true, available: true, accessibility: true, screenRecording: true, cursor: 'shared', primaryScreen: { width: 1000, height: 800, scaleFactor: 1, topology: 'display-1' }, context: 'window-1', lastHumanInputAt: 0, isPaused: false, isStopped: false };
    async status() { return { ...this.state, primaryScreen: { ...this.state.primaryScreen } }; }
    async requestPermissions() { return this.status(); }
    async execute(command, signal) {
        this.calls.push(command);
        if (this.onExecute) return await this.onExecute(command, signal);
        signal?.throwIfAborted();
        return command.op === 'screenshot' ? { data: 'live-pixels', mimeType: 'image/png' } : { changed: true };
    }
    async setIndicator(indicator) { this.indicator = indicator; }
    async releaseInputs() { this.releases++; }
    async resume() { this.state.isPaused = false; this.state.isStopped = false; }
    async close() { this.closed = true; }
    onEvent(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    emit(event, at = Date.now()) { for (const listener of this.listeners) listener({ event, at }); }
}

/** One shared user-session directory with isolated project coordinators and injectable native backends. */
async function fixture(t) {
    const root = await temporaryDirectory(t, 'ptbk computer coordination');
    const env = { PTBK_HOME: join(root, 'host') };
    const make = (name) => {
        const backend = new Backend();
        let enabled = true;
        const project = { root: join(root, name), runtime: runtimePaths(join(root, name)) };
        const control = new ComputerControl(project, () => ({ tools: [{ type: 'COMPUTER_CONTROL', variant: 'NATIVE', name: 'desktop', isEnabled: enabled }], values: { 'computer.isRecordingEnabled': false } }), env, () => {}, async () => undefined, backend);
        t.after(() => control.close());
        return { control, backend, disable: () => { enabled = false; } };
    };
    return { env, make };
}

/** Block one selected input until the coordinator's actual cancellation signal arrives. */
function interruptible(backend, op) {
    let began;
    const started = new Promise((resolve) => { began = resolve; });
    backend.onExecute = async (command, signal) => {
        if (command.op !== op) return { changed: true };
        began();
        return await new Promise((resolve, reject) => {
            if (signal.aborted) reject(signal.reason);
            else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
    };
    return started;
}

test('desktop observations are single-use and invalidated by topology and focus changes', async (t) => {
    const { make } = await fixture(t);
    const { control, backend } = make('first');
    let { frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    await control.execute({ op: 'click', x: 10, y: 20 }, { agent: 'Developer', frame });
    await assert.rejects(control.execute({ op: 'click', x: 10, y: 20 }, { agent: 'Developer', frame }), /stale|observe/i);
    ({ frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' }));
    backend.state.primaryScreen.topology = 'display-2';
    await assert.rejects(control.execute({ op: 'click', x: 10, y: 20 }, { agent: 'Developer', frame }), /stale|observe/i);
    ({ frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' }));
    backend.state.context = 'unexpected-window';
    await assert.rejects(control.execute({ op: 'click', x: 10, y: 20 }, { agent: 'Developer', frame }), /stale|observe|focus|context/i);
});

test('physical human input interrupts active input and allows observation while waiting for idle', { timeout: 5000 }, async (t) => {
    const { make } = await fixture(t);
    const { control, backend } = make('first');
    const { frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    const began = interruptible(backend, 'type');
    const pending = control.execute({ op: 'type', text: 'ordinary text' }, { agent: 'Developer', frame });
    const interrupted = assert.rejects(pending, /interrupted/i);
    await began;
    backend.state.lastHumanInputAt = Date.now();
    backend.emit('human-input', backend.state.lastHumanInputAt);
    await interrupted;
    const after = await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    await assert.rejects(control.execute({ op: 'click', x: 10, y: 20 }, { agent: 'Developer', frame: after.frame }), /human.*priority|five seconds/i);
    assert.ok(backend.releases > 0);
});

test('explicit takeover blocks agents across projects but keeps owner viewing/input available until handoff', async (t) => {
    const { make } = await fixture(t);
    const first = make('first');
    const second = make('second');
    await first.control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    await second.control.pause();
    await assert.rejects(first.control.execute({ op: 'screenshot' }, { agent: 'Developer' }), /paused/i);
    await second.control.ownerScreenshot();
    await second.control.ownerInput({ op: 'click', x: 20, y: 30 });
    await assert.rejects(first.control.execute({ op: 'accessibility' }, { agent: 'Developer' }), /paused/i);
    await second.control.resume();
    await first.control.execute({ op: 'screenshot' }, { agent: 'Developer' });
});

test('emergency stop from another project interrupts active input and stays latched across coordinator restart', { timeout: 5000 }, async (t) => {
    const { make } = await fixture(t);
    const first = make('first');
    const second = make('second');
    const { frame } = await first.control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    const began = interruptible(first.backend, 'move');
    const pending = first.control.execute({ op: 'move', x: 200, y: 200 }, { agent: 'Developer', frame });
    const interrupted = assert.rejects(pending, /interrupted/i);
    await began;
    await second.control.stop();
    await interrupted;
    const restarted = make('restarted');
    await assert.rejects(restarted.control.execute({ op: 'screenshot' }, { agent: 'Developer' }), /stopped/i);
    await assert.rejects(second.control.ownerScreenshot(), /stopped/i);
    await assert.rejects(second.control.ownerInput({ op: 'click', x: 20, y: 20 }), /stopped/i, 'remote input cannot silently turn an emergency stop into an owner pause');
    assert.equal(restarted.backend.calls.length, 0);
});

test('disabling an acquired tool interrupts an active primitive and denies later observation', { timeout: 5000 }, async (t) => {
    const { make } = await fixture(t);
    const { control, backend, disable } = make('first');
    const { frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    const began = interruptible(backend, 'drag');
    const pending = control.execute({ op: 'drag', x: 200, y: 200 }, { agent: 'Developer', frame });
    const interrupted = assert.rejects(pending, /interrupted/i);
    await began;
    disable();
    await control.refresh();
    await interrupted;
    await assert.rejects(control.execute({ op: 'screenshot' }, { agent: 'Developer' }), /disabled/i);
    assert.ok(backend.releases > 0);
});

test('a simultaneous ordinary pause never weakens another project emergency stop', async (t) => {
    const { make } = await fixture(t);
    const first = make('first');
    const second = make('second');
    for (let attempt = 0; attempt < 10; attempt++) {
        await first.control.resume();
        await Promise.all([first.control.pause(), second.control.stop()]);
        assert.equal((await first.control.status()).state, 'stopped', `emergency stop wins concurrent pause (attempt ${attempt + 1})`);
    }
});

test('Wallet protection and human browser reservations block desktop observations before any capture', async (t) => {
    const { env, make } = await fixture(t);
    const { control, backend } = make('first');
    const unprotect = await protectDesktop(env, 'Protected Wallet interval');
    await assert.rejects(control.execute({ op: 'screenshot' }, { agent: 'Developer' }), /Protected Wallet/);
    assert.equal(backend.calls.length, 0);
    await unprotect();
    const tabs = join(env.PTBK_HOME, 'browser-pools', 'tabs', 'profile');
    await mkdir(tabs, { recursive: true });
    const reservation = join(tabs, 'tab-human.json');
    await writeFile(reservation, JSON.stringify({ pid: process.pid }));
    assert.match(await desktopProtectionReason(env), /human control/);
    await assert.rejects(control.execute({ op: 'accessibility' }, { agent: 'Developer' }), /human control/);
    assert.equal(backend.calls.length, 0);
    await rm(reservation);
    await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
});

test('coordinates and timings are bounded, and release cannot remove another agent desktop lease', async (t) => {
    const { env, make } = await fixture(t);
    const first = make('first');
    const second = make('second');
    for (const command of [
        { op: 'click', x: -1, y: 0 }, { op: 'move', x: 1000, y: 0 }, { op: 'drag', x: 0, y: 800 },
        { op: 'move', x: 0, y: 0, durationMs: 0 }, { op: 'scroll', deltaY: Number.POSITIVE_INFINITY },
    ]) {
        const { frame } = await first.control.execute({ op: 'screenshot' }, { agent: 'Developer' });
        const count = first.backend.calls.length;
        await assert.rejects(first.control.execute(command, { agent: 'Developer', frame }), /outside|duration|Scroll/i);
        assert.equal(first.backend.calls.length, count, 'invalid input never reaches native backend');
    }
    const lease = join(computerDirectory(env), 'lease.json');
    const before = await readFile(lease, 'utf8');
    await second.control.release('Developer');
    assert.equal(await readFile(lease, 'utf8'), before, 'equal agent names in separate engines do not share ownership');
    await first.control.release('Developer');
    await second.control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    assert.notEqual(await readFile(lease, 'utf8'), before);
});

test('releasing unrelated work keeps the current agent lease, frame, held input and indicator', async (t) => {
    const { env, make } = await fixture(t);
    const { control, backend } = make('first');
    const { frame } = await control.execute({ op: 'screenshot' }, { agent: 'Developer' });
    await control.execute({ op: 'button', button: 'left', isDown: true }, { agent: 'Developer', frame });
    const before = await readFile(join(computerDirectory(env), 'lease.json'), 'utf8');
    const releases = backend.releases;
    const indicator = backend.indicator;
    await control.release('Unrelated task agent');
    assert.equal(await readFile(join(computerDirectory(env), 'lease.json'), 'utf8'), before);
    assert.equal(backend.releases, releases);
    assert.deepEqual(backend.indicator, indicator);
    await control.execute({ op: 'drag', x: 50, y: 60 }, { agent: 'Developer', frame });
    await control.release('Developer');
    assert.ok(backend.releases > releases, 'the owning release does clean up held input');
});

test('desktop operation guard excludes independent processes and reaps only dead unique tickets', { timeout: 15000 }, async (t) => {
    const { env } = await fixture(t);
    const operations = join(computerDirectory(env), 'operations');
    await mkdir(operations, { recursive: true });
    await writeFile(join(operations, 'dead-participant.json'), JSON.stringify({ pid: 2147483647, choosing: true, number: 0 }));
    const occupied = join(env.PTBK_HOME, 'critical-section');
    const critical = async () => {
        const handle = await open(occupied, 'wx');
        try { await delay(3); } finally { await handle.close(); await rm(occupied); }
    };
    const module = new URL('../dist/computer/protection.js', import.meta.url).href;
    const script = `
        import { desktopExclusive } from ${JSON.stringify(module)};
        import { open, rm } from 'node:fs/promises';
        import { setTimeout as delay } from 'node:timers/promises';
        const env = ${JSON.stringify(env)};
        for (let n = 0; n < 8; n++) await desktopExclusive(env, async () => {
            const handle = await open(${JSON.stringify(occupied)}, 'wx');
            try { await delay(3); } finally { await handle.close(); await rm(${JSON.stringify(occupied)}); }
        });
    `;
    const execute = promisify(execFile);
    await Promise.all([
        execute(process.execPath, ['--input-type=module', '-e', script]),
        execute(process.execPath, ['--input-type=module', '-e', script]),
        (async () => { for (let n = 0; n < 8; n++) await desktopExclusive(env, critical); })(),
    ]);
    assert.deepEqual(await readdir(operations), [], 'each process removes its own unique ticket; dead entries do not retain ownership');
});

test('cancelling a waiting operation removes its ticket without releasing the live owner', { timeout: 5000 }, async (t) => {
    const { env } = await fixture(t);
    let started;
    let release;
    const entered = new Promise((resolve) => { started = resolve; });
    const hold = new Promise((resolve) => { release = resolve; });
    const owner = desktopExclusive(env, async () => { started(); await hold; });
    await entered;
    const abort = new AbortController();
    let secondEntered = false;
    const contender = desktopExclusive(env, async () => { secondEntered = true; }, abort.signal);
    const cancelled = assert.rejects(contender, /abort/i);
    await delay(20);
    abort.abort();
    await cancelled;
    assert.equal(secondEntered, false);
    assert.equal((await readdir(join(computerDirectory(env), 'operations'))).filter((name) => name.endsWith('.json')).length, 1, 'the owner is still present');
    release();
    await owner;
    assert.deepEqual(await readdir(join(computerDirectory(env), 'operations')), []);
});

test('opt-in desktop screenshot retention stays private, rejects nonimages, and removes old/oversized media', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk desktop recording');
    const project = { root, runtime: runtimePaths(root) };
    const directory = join(project.runtime.root, 'computer-recordings');
    await recordComputerScreenshot(project, { data: 'clipboard text', mimeType: 'text/plain' });
    await recordComputerScreenshot(project, { data: Buffer.from('not png bytes').toString('base64'), mimeType: 'image/png' });
    await assert.rejects(readdir(directory));
    await mkdir(directory, { recursive: true });
    const oversized = join(directory, 'oversized.png');
    await writeFile(oversized, '');
    await truncate(oversized, 101 * 1024 * 1024);
    const old = join(directory, 'old.png');
    await writeFile(old, 'old local image');
    const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60_000);
    await utimes(old, weekAgo, weekAgo);
    const recent = new Date(Date.now() - 1000);
    await utimes(oversized, recent, recent);
    const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
    await recordComputerScreenshot(project, { data: png.toString('base64'), mimeType: 'image/png' });
    const remaining = await readdir(directory);
    assert.equal(remaining.length, 1);
    assert.notEqual(remaining[0], 'old.png');
    assert.notEqual(remaining[0], 'oversized.png');
    const saved = join(directory, remaining[0]);
    assert.deepEqual(await readFile(saved), png);
    if (process.platform !== 'win32') assert.equal((await stat(saved)).mode & 0o077, 0, 'other OS users cannot read opted-in screenshots');
    await assert.rejects(readdir(join(root, 'traces')), 'desktop image retention creates no versionable trace media');
});
