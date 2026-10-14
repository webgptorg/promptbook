import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { agentVisualIdentity } from '../dist/coder/agent-identity.js';
import { openDashboard } from '../dist/coder/service.js';
import { ProjectBrowser, discoverBrowserExecutable } from '../dist/coder/browser.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';

/** Installed Chrome exercises the static SPA without a frontend framework or paid providers. */
const executable = await discoverBrowserExecutable().catch(() => undefined);

/** Evaluate through an owned test tab's CDP connection, preserving browser error details. */
async function evaluator(browser, tab) {
    const [port] = (await readFile(join(browser.status().profile, 'DevToolsActivePort'), 'utf8')).split('\n');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5000) })).json();
    const socket = new WebSocket(targets.find(target => target.id === tab).webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(new Error('Dashboard DevTools connection timed out')), 5000);
        /** Stop waiting on every connection outcome and close failed test connections. */
        function cleanup() { clearTimeout(timer); socket.removeEventListener('open', opened); socket.removeEventListener('error', failed); socket.removeEventListener('close', failed); }
        /** The test owns this connection, including incomplete handshakes. */
        function fail(error) { cleanup(); socket.close(); reject(error); }
        /** Only an open socket can accept evaluations. */
        function opened() { cleanup(); resolve(); }
        /** Surface failed and interrupted handshakes without keeping the fixture alive. */
        function failed() { fail(new Error('Dashboard DevTools connection failed')); }
        socket.addEventListener('open', opened, { once: true }); socket.addEventListener('error', failed, { once: true }); socket.addEventListener('close', failed, { once: true });
    });
    let id = 0;
    return {
        close: () => socket.close(),
        async run(expression) {
            if (socket.readyState !== WebSocket.OPEN) throw new Error('Dashboard DevTools connection is not open');
            const current = ++id;
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => { cleanup(); socket.close(); reject(new Error('Dashboard evaluation timed out')); }, 10000);
                /** Remove evaluation listeners before resolving or rejecting this request. */
                function cleanup() { clearTimeout(timer); socket.removeEventListener('message', receive); socket.removeEventListener('close', closed); }
                /** An owned browser exiting cannot leave an evaluation pending. */
                function closed() { cleanup(); reject(new Error('Dashboard DevTools connection closed during evaluation')); }
                /** Ignore events and resolve only this read/write evaluation. */
                function receive(event) {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.id !== current) return;
                        cleanup();
                        if (message.error || message.result.exceptionDetails) reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
                        else resolve(message.result.result.value);
                    } catch (error) { cleanup(); reject(error); }
                }
                socket.addEventListener('message', receive);
                socket.addEventListener('close', closed, { once: true });
                try { socket.send(JSON.stringify({ id: current, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); }
                catch (error) { cleanup(); reject(error); }
            });
        },
    };
}

/** Poll externally visible browser behavior rather than assuming DOM loading order. */
async function until(read, predicate) {
    const deadline = Date.now() + 10000;
    let value;
    while (Date.now() < deadline) { value = await read(); if (predicate(value)) return value; await delay(50); }
    assert.fail(`Dashboard condition did not become observable; last value: ${JSON.stringify(value)}`);
}

/** Click only an enabled control, after the preceding command has released its UI lock. */
async function click(evaluate, selector) {
    await until(() => evaluate.run(`(()=>{const control=document.querySelector(${JSON.stringify(selector)});if(!control||control.disabled)return false;control.click();return true})()`), value => value === true);
}

test('browser SPA shares API state and choices, preserves drafts, rejects stale edits and reports disconnects', { skip: !executable, timeout: 45000 }, async t => {
    const projectPath = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-dashboard-')));
    let page, browser, evaluate, releaseSnapshot;
    let closed = false;
    t.after(async () => {
        releaseSnapshot?.();
        evaluate?.close();
        const results = await Promise.allSettled([browser?.close(), closed ? undefined : page?.close()]);
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
        await rm(projectPath, { recursive: true, force: true });
    });
    const workspace = await resolveWorkspace({ path: projectPath });
    const featured = [{ id: 'openai-codex', name: 'openai-codex', displayName: 'Codex', featured: true }];
    const all = [...featured, { id: 'fixture-extra', name: 'fixture-extra', displayName: 'Extra fixture', featured: false }];
    const calls = [];
    let state = { engineVersion: '9.8.7-test', project: projectPath, mode: 'daemon', persistent: false, status: 'working', phase: 'inference', running: true, waiting: false, paused: false,
        currentTask: 'work', currentSelection: { agent: 'Developer', visualIdentity: agentVisualIdentity('Developer'), harness: 'fixture-extra', model: 'observed-model', thinkingLevel: 'high' },
        statistics: { completed: 2, failed: 0 }, settings: { waitAfterPrompt: 20 }, pendingSettings: {}, restartSettings: {},
        settingsCapabilities: { live: ['waitAfterPrompt', 'harness', 'browserMode'], requiresRestart: ['mode'] }, harnessCatalog: featured, agents: [{ name: 'Developer', visualIdentity: agentVisualIdentity('Developer') }],
        tasks: [{ id: 'work', title: 'Actual fixture task', visualIdentity: agentVisualIdentity('Developer'), payload: 'A source-controlled description.', status: 'in-progress', priority: 3, source: { relativePath: 'tasks/work.book', revision: 'rev1' }, eligibility: { kind: 'ready', reason: 'Eligible.' } }],
        requests: [{ id: 'choose', prompt: 'Choose the deployment target', reason: 'Human decision.', taskId: 'work', choices: ['local', 'preview'] }, { id: 'text', prompt: 'Explain your preference', reason: 'Human response.' }], events: [{ type: 'output', message: 'Provider observation' }, { type: 'check', message: 'Check observed' }] };
    let snapshotGate, snapshotWaiting = false;
    page = await openDashboard(workspace, { token: randomUUID(), snapshot: async () => {
        const observed = structuredClone(state);
        if (snapshotGate) { const gate = snapshotGate; snapshotGate = undefined; snapshotWaiting = true; await gate; }
        return observed;
    }, command: async (action, input) => {
        calls.push({ action, input });
        if (action === 'pause') { state = { ...state, paused: true, pausePending: state.running }; return { paused: true, pausePending: state.running }; }
        if (action === 'harnesses') return input.name ? { name: input.name, models: ['reported-model'] } : { featured, more: all };
        if (action === 'read-task') return { id: 'work', revision: 'rev1', content: 'TASK Original fixture', source: 'tasks/work.book' };
        if (action === 'edit-task') throw new Error('Source changed; reload before editing.');
        if (action === 'answer') {
            if (!state.requests.some(request => request.id === input.id)) throw new Error('Request is already answered.');
            state = { ...state, requests: state.requests.filter(request => request.id !== input.id) }; return { id: input.id, status: 'answered' };
        }
        if (action === 'settings') { state = { ...state, pendingSettings: input.settings }; return { active: state.settings, pending: input.settings, requiresRestart: {} }; }
        throw new Error('Unexpected fixture command');
    } });
    browser = new ProjectBrowser(workspace, { executable, mode: 'headless' });
    const tab = await browser.navigate(page.sessionUrl);
    evaluate = await evaluator(browser, tab);
    await until(() => evaluate.run("document.getElementById('connection')?.textContent"), value => value === 'Connected');
    assert.equal(await evaluate.run("document.getElementById('identity').textContent"), 'Promptbook 9.8.7-test');
    assert.equal(await evaluate.run("document.getElementById('current-harness').textContent"), 'fixture-extra');
    assert.equal(await evaluate.run("document.getElementById('current-model').textContent"), 'observed-model / high');
    assert.equal(calls.length, 0, 'Opening the page performs inspection only');

    await evaluate.run("document.querySelector('[data-request=choose] select').value='preview';document.querySelector('[data-request=choose] select').dispatchEvent(new Event('change'));document.querySelector('[data-request=text] textarea').value='Unsubmitted response';document.getElementById('settings').value='{\"waitAfterPrompt\":50}';document.querySelector('#tasks details').open=true;refresh()");
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.querySelector('[data-request=choose] select').value"), 'preview');
    assert.equal(await evaluate.run("document.querySelector('[data-request=text] textarea').value"), 'Unsubmitted response');
    assert.equal(await evaluate.run("document.getElementById('settings').value"), '{"waitAfterPrompt":50}');
    assert.equal(await evaluate.run("document.querySelector('#tasks details').open"), true);

    snapshotGate = new Promise(resolve => { releaseSnapshot = resolve; });
    const oldPoll = evaluate.run('refresh()');
    void oldPoll.catch(() => {});
    await until(async () => snapshotWaiting, value => value === true);
    await click(evaluate, '[data-action=pause]');
    await until(async () => calls.some(call => call.action === 'pause'), value => value === true);
    assert.equal(await evaluate.run("document.getElementById('result').textContent"), 'Sending pause…', 'A mutation remains pending until its refreshed state is observed');
    releaseSnapshot(); releaseSnapshot = undefined;
    await oldPoll;
    await until(() => evaluate.run("document.getElementById('work-state').textContent"), value => value.startsWith('Pause pending'));
    assert.equal(state.paused, true);
    state = { ...state, paused: false, pausePending: false, running: false };
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.querySelector('[data-action=resume]').disabled"), true, 'Another client changed the same pause state');

    const readyState = state;
    state = { ...state, status: 'setup-required', activity: 'Blocked / failed', waiting: false,
        idleReason: 'openai-codex: codex was not found on PATH.', nextAction: 'Restart ptbk from the configured terminal.', nextOpportunity: Date.now() + 30_000 };
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.getElementById('waiting-info').classList.contains('hidden')"), false);
    assert.match(await evaluate.run("document.getElementById('waiting-reason').textContent"), /codex was not found on PATH/);
    assert.match(await evaluate.run("document.getElementById('waiting-next').textContent"), /Restart ptbk/);
    assert.match(await evaluate.run("document.getElementById('waiting-opportunity').textContent"), /Next check\/opportunity/);
    assert.equal(await evaluate.run("document.querySelector('[data-action=skip-wait]').disabled"), true);
    assert.equal(await evaluate.run("document.getElementById('work-state').textContent"), 'setup required');
    state = readyState;
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.getElementById('waiting-info').classList.contains('hidden')"), true);

    assert.equal(await evaluate.run("document.getElementById('attention').getBoundingClientRect().top < document.getElementById('runtime-title').getBoundingClientRect().top"), true);
    assert.match(await evaluate.run("document.getElementById('attention-summary').textContent"), /2 pending/);
    assert.equal(await evaluate.run("!!document.querySelector('#current-agent .mascot')"), true);
    await until(() => evaluate.run("!!document.querySelector('#connection-qr svg')"), value => value);
    assert((await evaluate.run("document.getElementById('dashboard-url').textContent")).includes(page.url));
    assert.equal(await evaluate.run('location.hash'), '', 'Pairing capability is removed before refresh');
    assert(!(await evaluate.run("document.getElementById('dashboard-url').textContent")).includes('#pair='));
    await click(evaluate, '#more');
    await until(() => evaluate.run("document.getElementById('catalog').textContent"), value => value.includes('Extra fixture'));
    await click(evaluate, '#catalog button:last-child');
    await until(() => evaluate.run("document.getElementById('harness-detail').textContent"), value => value.includes('reported-model'));

    await click(evaluate, '[data-request=choose] button');
    await until(() => evaluate.run("!!document.querySelector('[data-request=choose]')"), value => !value);
    assert.equal(calls.find(call => call.action === 'answer').input.response, 'preview');
    assert.equal(await evaluate.run("document.querySelector('[data-request=text] textarea').value"), 'Unsubmitted response');
    await click(evaluate, '#apply');
    await until(() => evaluate.run("document.getElementById('result').textContent"), value => value.includes('Awaiting safe boundary: waitAfterPrompt'));
    assert.equal(state.settings.waitAfterPrompt, 20, 'The browser does not claim deferred changes have applied');

    await click(evaluate, '#tasks button');
    await until(() => evaluate.run("document.getElementById('task-source').value"), value => value === 'TASK Original fixture');
    await evaluate.run("document.getElementById('task-source').value='TASK My editing draft'");
    state.tasks[0].source.revision = 'rev2';
    await evaluate.run('refresh()');
    assert.match(await evaluate.run("document.getElementById('editor-note').textContent"), /Source changed/);
    await click(evaluate, '#save-task');
    await until(() => evaluate.run("document.getElementById('result').textContent"), value => value.includes('Source changed'));
    assert.equal(await evaluate.run("document.getElementById('task-source').value"), 'TASK My editing draft');
    assert.equal(calls.find(call => call.action === 'edit-task').input.revision, 'rev1');

    await page.close(); closed = true;
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.getElementById('connection').textContent"), 'Disconnected');
    assert.equal(await evaluate.run("document.querySelector('#connection-qr svg')"), null);
    assert.match(await evaluate.run("document.getElementById('connection-note').textContent"), /Last snapshot/);
    assert.equal(await evaluate.run("document.querySelector('[data-action=stop]').disabled"), true);
    assert.equal(await evaluate.run("document.querySelector('[data-request=text] textarea').value"), 'Unsubmitted response');
});
