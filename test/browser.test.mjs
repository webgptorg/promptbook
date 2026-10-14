import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { ProjectBrowser, browserTools, discoverBrowserExecutable, waitForBrowserEndpoint, waitForBrowserExit } from '../dist/coder/browser.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { listRequests } from '../dist/coder/requests.js';

/** Git setup remains local to temporary fixture directories. */
const execute = promisify(execFile);

/** Allocate an isolated profile so tests never read or modify the user's browser session. */
async function fixture(t) {
    const project = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-browser-')));
    t.after(() => rm(project, { recursive: true, force: true }));
    return resolveWorkspace({ path: project });
}

test('Chrome endpoint polling retries Windows sharing locks and partial writes within its startup deadline', async () => {
    let reads = 0;
    const endpoint = await waitForBrowserEndpoint('fixture-port-file', {
        platform: 'win32', timeoutMs: 1000, read: async () => {
            reads++;
            if (reads <= 2) throw Object.assign(new Error('Chrome still holds the file'), { code: reads === 1 ? 'EBUSY' : 'EACCES' });
            if (reads === 3) return '519';
            return '51943\r\n/devtools/browser/fixture\r\n';
        },
    });
    assert.equal(reads, 4);
    assert.deepEqual(endpoint, { endpoint: 'http://127.0.0.1:51943', socket: 'ws://127.0.0.1:51943/devtools/browser/fixture' });
    await assert.rejects(waitForBrowserEndpoint('fixture-port-file', { platform: 'win32', timeoutMs: 20, read: async () => { throw Object.assign(new Error('permanently locked'), { code: 'EBUSY' }); } }), /within 20 ms \(EBUSY\)/);
    await assert.rejects(waitForBrowserEndpoint('fixture-port-file', { platform: 'linux', timeoutMs: 100, read: async () => { throw Object.assign(new Error('permission denied'), { code: 'EACCES' }); } }), /permission denied/);
    await assert.rejects(waitForBrowserEndpoint('fixture-port-file', { read: async () => { throw Object.assign(new Error('disk I\/O failure'), { code: 'EIO' }); } }), /disk I\/O failure/);
});

test('browser exit observation is bounded and releases listeners after every outcome', async () => {
    const child = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null });
    assert.equal(await waitForBrowserExit(child, 20), false);
    assert.equal(child.listenerCount('exit'), 0);
    const exited = waitForBrowserExit(child, 1000);
    child.exitCode = 0; child.emit('exit', 0);
    assert.equal(await exited, true);
    assert.equal(child.listenerCount('exit'), 0);
    assert.equal(await waitForBrowserExit(child, 20), true);
    assert.throws(() => waitForBrowserExit(child, 0), /positive integer/);
});

test('browser startup failures retain redacted child diagnostics and release ownership without deleting the profile', async t => {
    const workspace = await fixture(t);
    const secret = 'fixture-browser-secret-123456';
    const profile = join(workspace.projectPath, secret);
    await mkdir(profile);
    await writeFile(join(profile, 'session.txt'), 'Preserve existing profile bytes.\n');
    const previous = process.env.PTBK_TEST_BROWSER_SECRET;
    process.env.PTBK_TEST_BROWSER_SECRET = secret;
    const browser = new ProjectBrowser(workspace, { mode: 'headless', executable: process.execPath, profile });
    try {
        // Node rejects Chrome's flags, giving a deterministic native startup failure.
        await assert.rejects(browser.navigate('http://127.0.0.1/fixture'), error => {
            assert.match(error.message, /Chrome exited during startup/);
            assert.match(error.message, /Browser startup diagnostics:[\s\S]*bad option/);
            assert.doesNotMatch(error.message, new RegExp(secret));
            assert.match(error.message, /\[REDACTED\]/);
            return true;
        });
        assert.equal(browser.status().running, false);
        assert.equal(await readFile(join(profile, 'session.txt'), 'utf8'), 'Preserve existing profile bytes.\n');
        await assert.rejects(readFile(join(workspace.statePath, 'browser/lease.json')), { code: 'ENOENT' });
    } finally {
        await browser.close();
        if (previous === undefined) delete process.env.PTBK_TEST_BROWSER_SECRET; else process.env.PTBK_TEST_BROWSER_SECRET = previous;
    }
});

test('failed owned browser termination reports the failure and preserves ownership until a retry observes exit', { timeout: 10000 }, async t => {
    const workspace = await fixture(t);
    const lease = join(workspace.statePath, 'browser', 'lease.json');
    await mkdir(join(workspace.statePath, 'browser'), { recursive: true });
    const leaseContents = JSON.stringify({ pid: process.pid, profile: 'fixture-profile' });
    await writeFile(lease, leaseContents);
    const browser = new ProjectBrowser(workspace);
    const child = Object.assign(new EventEmitter(), { pid: 424242, exitCode: null, signalCode: null });
    // Substitute the native termination boundary; exercise actual close sequencing and lease files.
    browser.child = child; browser.leasePath = lease; browser.leaseOwned = true;
    const attempts = [];
    browser.terminateOwned = async (owned, force) => { assert.equal(owned, child); attempts.push(force); };
    await assert.rejects(browser.close(), /PID 424242 did not exit.*ownership leases were preserved/);
    assert.deepEqual(attempts, [false, true]);
    assert.equal(await readFile(lease, 'utf8'), leaseContents);
    assert.equal(child.listenerCount('exit'), 0);
    child.exitCode = 0; child.emit('exit', 0);
    await browser.close();
    await assert.rejects(readFile(lease), { code: 'ENOENT' });
});

test('browser inventories and missing executables do not launch or create disposable session profiles', async t => {
    const workspace = await fixture(t);
    const browser = new ProjectBrowser(workspace, { executable: join(workspace.projectPath, 'missing-chrome') });
    assert.deepEqual(browser.status(), { mode: 'headless', profile: join(workspace.statePath, 'browser/profile'), running: false });
    await assert.rejects(browser.navigate('https://example.com'), /No Chrome-compatible browser/);
    await assert.rejects(readFile(join(workspace.statePath, 'browser/lease.json')));
    const tools = browserTools(browser);
    assert.equal(tools.find(tool => tool.name === 'browser_read_page').readOnly, true);
    assert.ok(tools.filter(tool => tool.name !== 'browser_read_page').every(tool => tool.readOnly === false));
    await browser.close();
});

test('an owned browser lease is not deleted when another live owner prevents startup', async t => {
    const workspace = await fixture(t);
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    t.after(() => unrelated.kill());
    await mkdir(join(workspace.statePath, 'browser/profile'), { recursive: true });
    const lease = join(workspace.statePath, 'browser/lease.json');
    await writeFile(lease, JSON.stringify({ pid: unrelated.pid, profile: join(workspace.statePath, 'browser/profile') }));
    const browser = new ProjectBrowser(workspace, { executable: process.execPath });
    await assert.rejects(browser.navigate('https://example.com'), /already owned by PID/);
    await browser.close();
    assert.equal(JSON.parse(await readFile(lease, 'utf8')).pid, unrelated.pid);
    assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
});

test('a competing Chrome profile requires a durable safe handover and is never commandeered', async t => {
    const workspace = await fixture(t);
    const profile = join(workspace.statePath, 'browser/profile');
    await mkdir(profile, { recursive: true });
    await writeFile(join(profile, 'SingletonLock'), 'user browser owns this profile');
    const browser = new ProjectBrowser(workspace, { executable: process.execPath });
    await assert.rejects(browser.navigate('https://example.com'), /Safe handover request.*pending/);
    const requests = await listRequests(workspace);
    assert.equal(requests.length, 1); assert.equal(requests[0].kind, 'action');
    await browser.close();
    assert.equal(await readFile(join(profile, 'SingletonLock'), 'utf8'), 'user browser owns this profile');
});

test('explicit profiles inside Git are refused before opening unless the directory and all its files stay outside commits', async t => {
    let workspace = await fixture(t);
    await execute('git', ['-C', workspace.projectPath, 'init', '-q']);
    workspace = await resolveWorkspace({ path: workspace.projectPath });
    const profile = join(workspace.projectPath, 'private-profile');
    await mkdir(profile);
    await writeFile(join(profile, 'Cookies'), 'fixture-private-session-value');
    const browser = new ProjectBrowser(workspace, { profile, executable: process.execPath });
    await assert.rejects(browser.navigate('https://example.com'), /Browser profile must remain outside Git history/);
    assert.equal(await readFile(join(profile, 'Cookies'), 'utf8'), 'fixture-private-session-value');
    await assert.rejects(readFile(join(workspace.statePath, 'browser', 'lease.json')), { code: 'ENOENT' });
    await execute('git', ['-C', workspace.projectPath, 'add', 'private-profile/Cookies']);
    await writeFile(join(workspace.projectPath, '.gitignore'), 'private-profile/\n.ptbk/\n');
    await assert.rejects(browser.navigate('https://example.com'), /Browser profile must remain outside Git history/);
    const requests = await listRequests(workspace);
    assert.equal(requests.length, 1);
    assert.ok(requests.every(request => request.kind === 'action'));
    assert.doesNotMatch(JSON.stringify(requests), /fixture-private-session-value/);
    await execute('git', ['-C', workspace.projectPath, 'rm', '--cached', 'private-profile/Cookies']);
    await writeFile(join(profile, 'SingletonLock'), 'competing profile fixture');
    await assert.rejects(browser.navigate('https://example.com'), /Safe handover request/);
    await browser.close();
    assert.equal(await readFile(join(profile, 'Cookies'), 'utf8'), 'fixture-private-session-value');
});

/** Real installed Chrome validates CDP and persistence; CI without a browser skips this one integration. */
const executable = await discoverBrowserExecutable().catch(() => undefined);
test('real headless browser retains authenticated site sessions across process restarts and denies password collection', { skip: !executable, timeout: 180000 }, async t => {
    const project = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-browser-')));
    const workspace = await resolveWorkspace({ path: project });
    let browser; let resumed;
    const server = createServer((request, response) => {
        if (request.url === '/login') response.setHeader('Set-Cookie', 'ptbk_fixture=logged-in; Path=/; Max-Age=3600; SameSite=Lax');
        response.end(`<html><title>Fixture</title><body><p>${request.headers.cookie?.includes('ptbk_fixture=logged-in') ? 'Authenticated context' : 'Initial context'}</p><input id="password" type="password" value="never-read-this-value"><input id="note"><button id="apply" onclick="document.querySelector('p').textContent=document.querySelector('#note').value">Apply</button></body></html>`);
    });
    t.after(async () => {
        const results = await Promise.allSettled([resumed?.close(), browser?.close()]);
        server.closeAllConnections();
        await new Promise(accept => server.close(accept));
        const failed = results.find(result => result.status === 'rejected');
        if (failed) throw failed.reason;
        await rm(project, { recursive: true, force: true });
    });
    await new Promise(accept => server.listen(0, '127.0.0.1', accept));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = new ProjectBrowser(workspace, { mode: 'headless', executable });
    const tab = await browser.navigate(origin + '/login');
    let page;
    for (let i = 0; i < 50; i++) { page = await browser.readPage(tab); if (page.includes('Initial context')) break; await new Promise(accept => setTimeout(accept, 100)); }
    assert.match(page, /Initial context/); assert.doesNotMatch(page, /never-read-this-value/);
    assert.match(await browser.fill('#password', 'forbidden', tab), /requires human action/);
    assert.equal(await browser.fill('#note', 'Updated fixture', tab), 'Filled');
    assert.equal(await browser.click('#apply', tab), 'Clicked');
    assert.match(await browser.readPage(tab), /Updated fixture/);
    const profile = browser.status().profile;
    await browser.close();
    resumed = new ProjectBrowser(workspace, { mode: 'headless', executable });
    const next = await resumed.navigate(origin + '/context');
    for (let i = 0; i < 50; i++) { page = await resumed.readPage(next); if (page.includes('Authenticated context')) break; await new Promise(accept => setTimeout(accept, 100)); }
    assert.match(page, /Authenticated context/);
    assert.equal(resumed.status().profile, profile);
    await resumed.close();
    assert.ok(await readFile(join(profile, 'Default', 'Network', 'Cookies')).catch(() => readFile(join(profile, 'Default', 'Cookies'))));
});

test('profile and visibility are independent temporary settings and explicit changes never migrate sessions', async t => {
    const workspace = await fixture(t);
    const first = join(workspace.projectPath, 'first-profile');
    const second = join(workspace.projectPath, 'second-profile');
    await mkdir(first); await mkdir(second);
    await writeFile(join(first, 'Cookies'), 'first-identity');
    await writeFile(join(second, 'Cookies'), 'second-identity');
    const browser = new ProjectBrowser(workspace, { mode: 'headless', profile: first, executable: join(workspace.projectPath, 'missing-chrome') });
    assert.equal(browser.status().profile, first);
    assert.equal((await browser.configure({ profile: second })).mode, 'headless');
    assert.equal(browser.status().profile, second);
    await assert.rejects(browser.configure({ profile: join(workspace.projectPath, 'missing-profile') }), /does not exist/);
    assert.equal(browser.status().profile, second);
    assert.equal(await readFile(join(first, 'Cookies'), 'utf8'), 'first-identity');
    assert.equal(await readFile(join(second, 'Cookies'), 'utf8'), 'second-identity');
    assert.equal((await browser.configure({ profile: undefined })).profile, join(workspace.statePath, 'browser/profile'));
    await browser.close();
});
