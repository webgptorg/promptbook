import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fsPromises from 'node:fs/promises';
import { createServer } from 'node:http';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { BROWSER_STARTUP_TIMEOUT_MS, BrowserPools } from '../dist/browser/pool.js';
import { ProjectBrowser } from '../dist/browser/browser.js';
import { PtbkError } from '../dist/common/errors.js';
import { isProcessAlive, killVerifiedProcess, verifyRecordedProcess } from '../dist/common/process.js';
import { projectAt } from '../dist/project/workspace.js';
import { temporaryDirectory, waitFor } from './helpers.mjs';

/** Starts a disposable Node-based browser substitute through the real pool launcher and its real native child APIs. */
async function fixture(t, mode) {
    const cleanup = [];
    const root = await temporaryDirectory(t, 'ptbk browser startup', cleanup);
    const profile = join(root, 'profile with spaces');
    await fsPromises.mkdir(profile);
    const spawn = childProcess.spawn;
    const children = [];
    childProcess.spawn = (executable, args, options) => {
        if (executable !== 'fixture-browser') return spawn(executable, args, options);
        if (mode === 'delayed-spawn') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000);
        const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/fake-browser.mjs', import.meta.url)), ...args, `--fixture-mode=${mode}`], options);
        children.push(child);
        return child;
    };
    syncBuiltinESMExports();
    cleanup.push(async () => {
        childProcess.spawn = spawn;
        syncBuiltinESMExports();
        for (const child of children) if (child.exitCode === null && child.pid) await killVerifiedProcess(child.pid, { group: process.platform !== 'win32' });
    });
    const pools = new BrowserPools({ ...process.env, PTBK_HOME: join(root, 'pool home') });
    const connect = (startupDeadline) => pools.connect({ profile, executable: 'fixture-browser', headless: true, args: [], project: root, instanceId: 'fixture', startupDeadline });
    return { root, profile, pools, children, connect };
}

/** A configured project browser with a controlled pool, so recovery and the real WebSocket path stay under test. */
function projectBrowser(root, pools) {
    return new ProjectBrowser(projectAt(root), 'fixture', () => ({ tool: { type: 'BROWSER', variant: 'CHROME', name: 'fixture', executable: process.execPath, isEnabled: true, isHeadless: true, profile: { source: 'PROJECT' } }, overridden: false }), process.env, () => undefined, () => false, pools);
}

test('browser startup: a slow first port announcement survives the former 30-second cutoff without relaunching', { timeout: 20_000 }, async (t) => {
    const { connect, children } = await fixture(t, 'port-file');
    const readFile = fsPromises.readFile;
    const now = Date.now;
    let elapsed = 0;
    let reads = 0;
    Date.now = () => now() + elapsed;
    fsPromises.readFile = async (path, ...args) => {
        const content = await readFile(path, ...args);
        if (String(path).endsWith('DevToolsActivePort')) {
            elapsed += 10_000;
            if (++reads <= 3) return '';
        }
        return content;
    };
    syncBuiltinESMExports();
    try {
        const { record } = await connect();
        assert.ok(elapsed > 30_000, 'startup crossed the old per-process deadline');
        assert.equal(children.length, 1, 'a slow browser was not killed and started cold again');
        assert.equal(record.pid, children[0].pid);
        assert.ok(record.port > 0);
    } finally {
        Date.now = now;
        fsPromises.readFile = readFile;
        syncBuiltinESMExports();
    }
});

test('browser startup: the stderr endpoint works without a port file and transient discovery failures keep the same child', { timeout: 20_000 }, async (t) => {
    const { connect, profile, children } = await fixture(t, 'stderr');
    await fsPromises.writeFile(join(profile, 'DevToolsActivePort'), '1\n/devtools/browser/stale\n');
    const { record } = await connect();
    assert.equal(children.length, 1);
    assert.match(record.webSocket, /^ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/fixture$/);
    await assert.rejects(fsPromises.readFile(join(profile, 'DevToolsActivePort')), { code: 'ENOENT' });
    assert.equal(await fsPromises.readFile(join(profile, 'requests.txt'), 'utf8'), '3', 'HTTP 503 was retried until discovery was ready');
});

test('browser startup: an unusable endpoint expires, kills only its own child and leaves no pool record', { timeout: 20_000 }, async (t) => {
    const { connect, profile, pools, children } = await fixture(t, 'invalid');
    const fetch = globalThis.fetch;
    const now = Date.now;
    let elapsed = 0;
    Date.now = () => now() + elapsed;
    globalThis.fetch = async (...args) => {
        elapsed += 50_000;
        return fetch(...args);
    };
    try {
        await assert.rejects(connect(), (error) => error instanceof PtbkError && error.details.phase === 'browser startup' && /no matching local browser WebSocket/.test(error.details.reason));
        assert.equal(children.length, 1);
        await waitFor(() => !isProcessAlive(children[0].pid), { timeoutMs: 5000, message: 'the failed startup child to exit' });
        assert.equal(await pools.read(profile), undefined);
    } finally {
        globalThis.fetch = fetch;
        Date.now = now;
    }
});

test('browser startup: early exit retains its cause and redacts bounded native diagnostics', { timeout: 20_000 }, async (t) => {
    const { connect } = await fixture(t, 'exit');
    await assert.rejects(connect(), (error) => {
        assert.match(error.message, /exit code 9/);
        assert.match(error.details.reason, /Fixture browser refused startup/);
        assert.doesNotMatch(error.details.reason, /fixture-startup-secret/);
        return true;
    });
});

test('browser startup: slow native process creation does not mark the owned child as a reused PID', { timeout: 20_000 }, async (t) => {
    const { connect } = await fixture(t, 'delayed-spawn');
    const { record } = await connect();
    assert.equal(await verifyRecordedProcess(record.pid, record.launchedAt), 'verified', 'the owned process remains eligible for lifecycle cleanup');
});

test('browser startup: a discovery endpoint cannot leave its WebSocket handshake waiting forever', { timeout: 20_000 }, async (t) => {
    const root = await temporaryDirectory(t, 'ptbk browser handshake');
    const sockets = new Set();
    const server = createServer();
    server.on('upgrade', (_request, socket) => {
        sockets.add(socket);
        socket.once('close', () => sockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => {
        for (const socket of sockets) socket.destroy();
        await new Promise((resolve) => server.close(resolve));
    });
    const now = Date.now;
    let elapsed = 0;
    let disconnected = 0;
    const browser = projectBrowser(root, {
        async connect() {
            elapsed = BROWSER_STARTUP_TIMEOUT_MS - 100;
            return { record: { headless: true, webSocket: `ws://127.0.0.1:${server.address().port}/devtools/browser/fixture` }, launched: true };
        },
        async disconnect() { disconnected++; },
    });
    Date.now = () => now() + elapsed;
    try {
        await assert.rejects(browser.connect(), (error) => /WebSocket connection in time/.test(error.details?.reason));
        assert.equal(disconnected, 1, 'the failed connection releases its pool membership');
    } finally {
        Date.now = now;
    }
});

test('browser startup: technical retries share one total budget instead of renewing the cold-start timeout', { timeout: 20_000 }, async (t) => {
    const root = await temporaryDirectory(t, 'ptbk browser recovery');
    const now = Date.now;
    let elapsed = 0;
    const deadlines = [];
    const browser = projectBrowser(root, {
        async connect(input) {
            deadlines.push(input.startupDeadline);
            elapsed += BROWSER_STARTUP_TIMEOUT_MS / 2;
            throw new PtbkError('Fixture technical startup failure', { kind: 'technical' });
        },
    });
    Date.now = () => now() + elapsed;
    try {
        await assert.rejects(browser.connect(), /Fixture technical startup failure/);
        assert.equal(deadlines.length, 2, 'the spent budget does not allow another launch');
        assert.equal(new Set(deadlines).size, 1, 'all attempts receive the original deadline');
        assert.equal(browser.inspect().state, 'failed');
    } finally {
        Date.now = now;
    }
});
