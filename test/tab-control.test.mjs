import assert from 'node:assert/strict';
import { mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { findBrowserExecutable } from '../dist/browser/browser.js';
import { BrowserFleet } from '../dist/browser/fleet.js';
import { TabControls } from '../dist/browser/tab-control.js';
import { TabReservations } from '../dist/browser/tab-reservations.js';
import { projectAt } from '../dist/project/workspace.js';
import { ControlClient } from '../dist/service/control.js';
import { readProcessRecord } from '../dist/service/records.js';
import { TabSurfaceRelay } from '../dist/ui/tab-surface.js';
import { tabFeaturePage } from '../dist/ui/tab-page.js';
import { initializedProject, ptbk, surfaceClient, temporaryDirectory, waitFor } from './helpers.mjs';

/**
 * Whether a real Chrome-compatible browser can run here.
 */
async function realBrowserSkip() {
    if (process.env.PTBK_TEST_BROWSER === '0') return 'PTBK_TEST_BROWSER=0';
    if (process.env.CI && process.env.PTBK_TEST_BROWSER !== '1') return 'runs on CI only with PTBK_TEST_BROWSER=1';
    return (await findBrowserExecutable({ variant: 'CHROME' })) ? false : 'no Chrome-compatible browser is installed';
}

/**
 * Pages of the test site: a text area over a password field (input and protected clearing), a login form whose fields
 * fill known parts of the viewport, and the signed-in home page.
 */
function site() {
    return createServer((request, response) => {
        const path = (request.url ?? '/').split('?')[0];
        if (request.method === 'POST' && path === '/session') {
            let body = '';
            request.on('data', (chunk) => (body += chunk));
            request.on('end', () => {
                const form = new URLSearchParams(body);
                const ok = form.get('username') === 'alice' && form.get('password') === 'secret';
                response.writeHead(303, { location: ok ? '/home' : '/login?error' });
                response.end();
            });
            return;
        }
        response.setHeader('content-type', 'text/html');
        const fill = 'position:fixed;left:0;width:100%;box-sizing:border-box;margin:0;font-size:24px';
        if (path === '/input') return response.end(`<title>Input</title><body style="margin:0"><textarea id="t" style="${fill};top:0;height:45%"></textarea><input id="p" type="password" style="${fill};top:55%;height:45%"></body>`);
        if (path === '/login') return response.end(`<title>Sign in</title><body style="margin:0"><form method="post" action="/session"><input name="username" autocomplete="username" style="${fill};top:0;height:30%"><input name="password" type="password" autocomplete="current-password" style="${fill};top:35%;height:30%"><button style="${fill};top:70%;height:30%">Sign in</button></form></body>`);
        if (path === '/home') return response.end('<title>Home</title><p>Signed in as alice</p>');
        response.end(`<title>${request.url}</title><p>Page ${request.url}</p>`);
    });
}

/**
 * Polls the viewer until a frame arrives.
 */
async function nextFrame(session, grant, after = { version: 0, frame: 0 }) {
    const deadline = Date.now() + 20_000;
    let state = after;
    while (Date.now() < deadline) {
        const result = await session.poll(grant, state, 2_000);
        if (result.frame) return result;
        state = { version: result.version, frame: state.frame };
    }
    throw new Error('no frame streamed');
}

/**
 * Key down and up of one key, as the viewer sends them.
 */
function press(key, code, keyCode, text, command) {
    return [
        { type: 'key', action: 'down', key, code, keyCode, ...(text ? { text } : {}), ...(command ? { command } : {}) },
        { type: 'key', action: 'up', key, code, keyCode },
    ];
}

/**
 * A click at a relative position of the frame.
 */
function click(x, y) {
    return [
        { type: 'mouse', action: 'move', x, y },
        { type: 'mouse', action: 'down', x, y, button: 'left', buttons: 1, clickCount: 1 },
        { type: 'mouse', action: 'up', x, y, button: 'left', buttons: 0, clickCount: 1 },
    ];
}

test('live tab control: one tab is reserved for the user across engines of the profile, streamed with ordered input, and returned only by an explicit handoff', { skip: await realBrowserSkip(), timeout: 240_000 }, async (t) => {
    const teardown = [];
    const root = await temporaryDirectory(t, 'ptbk tab control', teardown);
    const env = { ...process.env, PTBK_HOME: join(root, 'ptbk home') };
    const profile = join(root, 'shared profile');
    await mkdir(profile, { recursive: true });
    const project = async (name) => {
        const base = join(root, name);
        await mkdir(join(base, '.ptbk', 'tmp'), { recursive: true });
        return { root: base, name, runtime: { root: join(base, '.ptbk'), temporary: join(base, '.ptbk', 'tmp'), browserProfile: join(base, '.ptbk', 'browser', 'profile') } };
    };
    const server = site();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const url = (path) => `${origin}${path}`;
    const settings = { tools: [{ type: 'BROWSER', variant: 'CHROME', name: 'shared', isEnabled: true, profile: { source: 'CUSTOM', path: profile }, isHeadless: true }], overriddenTools: new Set() };
    const a = new BrowserFleet(await project('alpha'), () => settings, env, () => undefined, 'engine-alpha');
    const b = new BrowserFleet(await project('beta'), () => settings, env, () => undefined, 'engine-beta');
    const logs = [];
    const controls = new TabControls({ onChange: () => undefined, log: (text) => logs.push(text) });
    teardown.push(async () => {
        await controls.closeAll('test over');
        await a.close();
        await b.close();
        server.closeAllConnections();
        server.close();
    });
    await Promise.all([a.startEnabled(), b.startEnabled()]);
    const alpha = a.instance('shared');
    const reservations = new TabReservations(env);

    // A task of each engine works in its own tab.
    const task = await a.scope('task one').acquire();
    await task.open(url('/input'));
    const other = await b.scope('task two').acquire();
    assert.match(await other.open(url('/beta')), /Page \/beta/);
    const target = (await alpha.pages()).find((page) => page.task === 'task one').targetId;

    // The user takes the task's tab: it is reserved for every engine of the profile before anything is shown.
    const session = await controls.open({ browser: alpha, target, purpose: 'browse' });
    assert.equal(session.state, 'controlled');
    assert.equal(session.view().task, 'task one', 'the task that worked in the tab is shown');
    assert.deepEqual((await reservations.list(alpha.profile)).map((entry) => entry.targetId), [target]);
    const taskTabs = await task.tabs();
    assert.match(taskTabs, /the user took control of the tab/);
    assert.match(taskTabs, new RegExp(`^u ${target}  \\(controlled by the user\\)$`, 'm'), 'the tab is listed without its address or title');
    await waitFor(async () => (await other.tabs()).includes(`u ${target}`), { timeoutMs: 5_000, message: 'the other engine to see the reservation' });
    await assert.rejects(other.tab('select', target), /controlled by the user/, 'another engine cannot take the tab');
    await assert.rejects(other.protocol('Target.attachToTarget', { targetId: target, flatten: true }, 'browser'), /a tab the user controls/, 'nor attach to it over DevTools');
    await assert.rejects(new TabControls({ onChange: () => undefined, log: () => undefined }).open({ browser: b.instance('shared'), target, purpose: 'browse' }), /already controlled/, 'one controlling surface only');
    assert.match(await other.open(url('/beta2')), /Page \/beta2/, 'independent tabs keep working');

    // The viewer streams frames and its inputs reach the tab in order.
    const grant = session.claim();
    await assert.rejects(session.input('not the grant', []), /no longer authorized/);
    await session.viewerAttached(grant);
    await session.resize(grant, { width: 900, height: 600, scale: 1 });
    const first = await nextFrame(session, grant);
    assert.match(first.frame.data, /^\/9j\//, 'a JPEG frame');
    assert.equal(first.view.url, url('/input'));
    await session.input(grant, [...click(0.5, 0.2), ...press('a', 'KeyA', 65, 'a'), ...press('b', 'KeyB', 66, 'b'), { type: 'text', text: ' pasted' }]);
    await session.input(grant, press('a', 'KeyA', 65, undefined, 'selectAll'));
    assert.deepEqual(await session.clipboard(grant, 'copy'), { text: 'ab pasted' }, 'an explicit copy returns the selection');
    await session.input(grant, [...click(0.5, 0.75), { type: 'text', text: 'hunter2' }]);
    await session.navigate(grant, 'go', url('/elsewhere'));
    assert.equal(session.view().url, url('/elsewhere'));
    assert.equal(session.view().canGoBack, true);
    await session.navigate(grant, 'back');
    await waitFor(() => session.view().url === url('/input'), { timeoutMs: 10_000, message: 'Back to return to the input page' });

    // Closing the viewer detaches it: no handoff, the tab stays reserved; reopening gives fresh access.
    session.viewerDetached(grant);
    assert.equal(session.view().viewer, 'detached');
    assert.equal(session.state, 'controlled');
    assert.equal((await reservations.list(alpha.profile)).length, 1);
    const fresh = session.claim();
    assert.notEqual(fresh, grant);
    await assert.rejects(session.poll(grant, { version: 0, frame: 0 }, 0), /no longer authorized/, 'the old viewer stops working');
    await session.viewerAttached(fresh);
    assert.throws(() => session.claim(), /shown in another viewer/, 'a streaming viewer is never taken over silently');

    // The explicit handoff clears protected values, releases the reservation and tells the task to revalidate.
    const returned = await session.handBack();
    assert.equal(returned.state, 'returned', JSON.stringify(returned));
    assert.deepEqual(await reservations.list(alpha.profile), []);
    await assert.rejects(session.input(fresh, []), /no longer authorized/, 'no input reaches the tab after the handoff');
    assert.match(await task.tabs(), /handed back the tab/);
    await task.tab('select', target);
    assert.match(await task.protocol('Runtime.evaluate', { expression: 'document.querySelector("#p").value + "|" + document.querySelector("#t").value', returnByValue: true }, 'page'), /"\|ab pasted"/, 'the password typed by the user was cleared, other input stays');

    // Manual Wallet sign-in: the credential submitted on the site becomes a save offer once the sign-in is seen.
    const saved = [];
    const satisfied = [];
    const wallet = {
        request: 'request-1',
        origin,
        offer: async (candidate) => ({ kind: 'save', account: candidate.username }),
        save: async (candidate) => {
            saved.push(candidate);
            return 'Saved the login.';
        },
        satisfy: async (access) => {
            satisfied.push(access);
            return { resolved: true, reason: 'The request is complete.' };
        },
    };
    const signIn = await controls.open({ browser: alpha, url: url('/login'), purpose: 'wallet', wallet });
    assert.equal(await controls.open({ browser: alpha, url: url('/login'), purpose: 'wallet', wallet }), signIn, 'one manual sign-in per request');
    const access = signIn.claim();
    await signIn.viewerAttached(access);
    await signIn.resize(access, { width: 900, height: 600, scale: 1 });
    await nextFrame(signIn, access);
    await waitFor(() => signIn.view().url === url('/login'), { timeoutMs: 10_000, message: 'the login page' });
    await signIn.input(access, [...click(0.5, 0.15), { type: 'text', text: 'alice' }, ...click(0.5, 0.5), { type: 'text', text: 'secret' }, ...press('Enter', 'Enter', 13, '\r')]);
    await waitFor(() => signIn.view().offer, { timeoutMs: 20_000, message: `the save offer (${JSON.stringify(signIn.view())})` });
    const view = signIn.view();
    assert.equal(view.url, url('/home'));
    assert.deepEqual(view.signIn, { detected: true, origin });
    assert.deepEqual({ ...view.offer, id: undefined }, { id: undefined, kind: 'save', origin, account: 'alice' });
    assert.doesNotMatch(JSON.stringify(view), /secret/, 'the shared view never carries the password');
    assert.equal(signIn.state, 'controlled', 'a detected sign-in does not hand the tab back');
    assert.match(await signIn.answerOffer(view.offer.id, 'yes'), /Saved the login/);
    assert.deepEqual(saved, [{ origin, username: 'alice', password: 'secret' }]);
    await assert.rejects(signIn.answerOffer(view.offer.id, 'yes'), /no longer current/, 'a stale answer saves nothing');
    assert.equal(satisfied.length, 0, 'saving does not settle the request');
    const done = await signIn.handBack();
    assert.equal(done.state, 'returned');
    assert.deepEqual(satisfied, [{ origin, account: 'alice', evidence: true }]);
    assert.match(done.outcome, /The request is complete/);

    // A lost tab ends the control without a handoff; ending use closes the tab.
    const lost = await controls.open({ browser: alpha, url: url('/lost'), purpose: 'browse' });
    await (await b.instance('shared').link()).send('Target.closeTarget', { targetId: lost.targetId });
    await waitFor(() => lost.state === 'lost', { timeoutMs: 10_000, message: 'the closed tab to end control' });
    assert.match(lost.view().problem, /tab was closed/);
    const ended = await controls.open({ browser: alpha, url: url('/ended'), purpose: 'browse' });
    await ended.endUse();
    assert.equal(ended.state, 'ended');
    assert.ok(!(await alpha.pages()).some((page) => page.targetId === ended.targetId), 'ending use closes the tab');
    assert.deepEqual(await reservations.list(alpha.profile), [], 'nothing stays reserved');
    assert.ok(!logs.some((line) => /secret|hunter2|ab pasted/.test(line)), 'logs never carry typed values');
});

test('tab viewer page: a trusted toolbar over the stream, no project control, Wallet choice or socket address of its own', () => {
    const page = tabFeaturePage({ browser: 'shared', hint: 'Return control from your terminal.' });
    for (const control of ['id="back"', 'id="forward"', 'id="reload"', 'id="address"', 'id="shortcut"', 'id="copy"', 'id="paste"', 'id="stage"']) assert.ok(page.body.includes(control), control);
    assert.doesNotMatch(page.body + page.script, /Return control to agent|Save to Wallet|\/api\/|ws:\/\//, 'the handoff and Wallet choices stay in the dashboard; the page only uses its surface transport');
    assert.doesNotMatch(page.script, /readText\(\)[^;]*setInterval|setInterval\([^)]*clipboard/, 'no background clipboard synchronization');
});

test('engine: tab control over the local control channel, presented by the terminal relay; closing the viewer keeps the tab with the user until the handoff', { skip: await realBrowserSkip(), timeout: 240_000 }, async (t) => {
    const executable = await findBrowserExecutable({ variant: 'CHROME' });
    const { project, env: baseEnv } = await initializedProject(t, { check: 'process.exit(0);\n' });
    const env = { ...baseEnv, CHROME_PATH: executable };
    const server = site();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = (path) => `http://127.0.0.1:${server.address().port}${path}`;
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    assert.equal((await ptbk(['start', '--no-persist', '--raw', '--no-server'], { cwd: project, env })).code, 0);
    assert.equal((await ptbk(['pause', '--raw'], { cwd: project, env })).code, 0);
    const control = async (method, params = {}, signal) => await new ControlClient(projectAt(project), await readProcessRecord(projectAt(project))).request(method, params, 60_000, signal);

    const opened = await control('tab-control-open', { url: url('/input') });
    assert.equal(opened.control.state, 'controlled');
    assert.ok(opened.grant);
    const snapshot = await control('snapshot');
    assert.equal(snapshot.tabControls[0].id, opened.control.id, 'every client sees who controls the tab');
    assert.ok(!JSON.stringify(snapshot).includes(opened.grant), 'the viewer grant is not shared');
    assert.equal((await control('tab-control-tabs')).tabs.find((tab) => tab.targetId === opened.control.targetId).reserved, true);
    await assert.rejects(control('tab-control-poll', { id: opened.control.id, grant: 'not the grant', version: 0, frame: 0, wait: 0 }), /no longer authorized/);

    // The terminal's own temporary server presents the viewer (the project HTTP server is off).
    const states = [];
    const relay = await TabSurfaceRelay.open({ control: opened.control, grant: opened.grant, channel: control, onState: (state) => states.push(state) });
    t.after(async () => await relay.close());
    const page = await surfaceClient(relay.url);
    t.after(() => page.close());
    assert.equal(page.welcomed, true);
    page.sendText({ type: 'resize', width: 900, height: 600, scale: 1 });
    await waitFor(() => page.binary.length > 0, { timeoutMs: 20_000, message: 'a streamed frame' });
    assert.equal(page.binary.at(-1).subarray(0, 2).toString('hex'), 'ffd8', 'frames arrive as JPEG');
    assert.ok(page.messages.some((message) => message.type === 'view' && message.view.url === url('/input')), 'the toolbar gets the actual address');
    page.sendText({ type: 'input', events: [{ type: 'mouse', action: 'down', x: 0.5, y: 0.2, button: 'left', buttons: 1, clickCount: 1 }, { type: 'mouse', action: 'up', x: 0.5, y: 0.2, button: 'left', clickCount: 1 }, { type: 'text', text: 'from the viewer' }] });
    page.sendText({ type: 'input', events: [{ type: 'key', action: 'down', key: 'a', code: 'KeyA', keyCode: 65, modifiers: 2, command: 'selectAll' }, { type: 'key', action: 'up', key: 'a', code: 'KeyA', keyCode: 65, modifiers: 2 }] });
    page.sendText({ type: 'clipboard', action: 'copy' });
    await waitFor(() => page.messages.find((message) => message.type === 'clipboard'), { timeoutMs: 10_000, message: 'the explicit copy' });
    assert.equal(page.messages.find((message) => message.type === 'clipboard').text, 'from the viewer');
    page.sendText({ type: 'navigate', action: 'go', url: url('/second') });
    await waitFor(() => page.messages.some((message) => message.type === 'view' && message.view.url === url('/second') && message.view.canGoBack), { timeoutMs: 10_000, message: 'navigation from the toolbar' });

    // Closing the page detaches the viewer: no handoff, the tab stays reserved and fresh access reopens it.
    page.close();
    await waitFor(async () => (await control('snapshot')).tabControls[0].viewer === 'detached', { timeoutMs: 30_000, message: 'the viewer to detach' });
    assert.equal((await control('snapshot')).tabControls[0].state, 'controlled');
    const reopened = await control('tab-control-reopen', { id: opened.control.id });
    assert.notEqual(reopened.grant, opened.grant);
    await waitFor(() => relay.surfaceState === 'closed', { timeoutMs: 20_000, message: 'the replaced viewer to close' });

    // The explicit handoff from any local client returns the tab to automation.
    const returned = await control('tab-control-handback', { id: opened.control.id });
    assert.equal(returned.control.state, 'returned');
    assert.equal((await control('tab-control-tabs')).tabs.find((tab) => tab.targetId === opened.control.targetId).reserved, false);

    // A tab controlled at engine stop is closed, not left to another engine's automation.
    const kept = await control('tab-control-open', { url: url('/kept') });
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
    const tabs = join(env.PTBK_HOME, 'browser-pools', 'tabs');
    const left = (await readdir(tabs, { recursive: true }).catch(() => [])).filter((name) => /tab-[^/\\]+\.json$/.test(name));
    assert.ok(kept.control.id);
    assert.deepEqual(left, [], 'nothing stays reserved after the engine stopped');
});
