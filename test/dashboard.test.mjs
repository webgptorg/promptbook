import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { openDashboard } from '../dist/coder/service.js';
import { ProjectBrowser, discoverBrowserExecutable } from '../dist/coder/browser.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';

/** Installed Chrome exercises the static SPA without a frontend framework or paid providers. */
const executable = await discoverBrowserExecutable().catch(() => undefined);

/** Evaluate through an owned test tab's CDP connection, preserving browser error details. */
async function evaluator(browser, tab) {
    const [port] = (await readFile(join(browser.status().profile, 'DevToolsActivePort'), 'utf8')).split('\n');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const socket = new WebSocket(targets.find(target => target.id === tab).webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let id = 0;
    return {
        close: () => socket.close(),
        async run(expression) {
            const current = ++id;
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => { socket.removeEventListener('message', receive); reject(new Error('Dashboard evaluation timed out')); }, 10000);
                /** Ignore events and resolve only this read/write evaluation. */
                function receive(event) {
                    const message = JSON.parse(event.data);
                    if (message.id !== current) return;
                    clearTimeout(timer); socket.removeEventListener('message', receive);
                    if (message.error || message.result.exceptionDetails) reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
                    else resolve(message.result.result.value);
                }
                socket.addEventListener('message', receive);
                socket.send(JSON.stringify({ id: current, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
            });
        },
    };
}

/** Poll externally visible browser behavior rather than assuming DOM loading order. */
async function until(read, predicate) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) { const value = await read(); if (predicate(value)) return value; await delay(50); }
    assert.fail('Dashboard condition did not become observable');
}

test('browser SPA shares API state and choices, preserves drafts, rejects stale edits and reports disconnects', { skip: !executable, timeout: 45000 }, async t => {
    const projectPath = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-dashboard-')));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const workspace = await resolveWorkspace({ path: projectPath });
    const featured = [{ id: 'openai-codex', name: 'openai-codex', displayName: 'Codex', featured: true }];
    const all = [...featured, { id: 'fixture-extra', name: 'fixture-extra', displayName: 'Extra fixture', featured: false }];
    const calls = [];
    let state = { engineVersion: '9.8.7-test', project: projectPath, mode: 'daemon', persistent: false, status: 'working', phase: 'inference', running: true, waiting: false, paused: false,
        currentTask: 'work', currentSelection: { agent: 'Developer', harness: 'fixture-extra', model: 'observed-model', thinkingLevel: 'high' },
        statistics: { completed: 2, failed: 0 }, settings: { waitAfterPrompt: 20 }, pendingSettings: {}, restartSettings: {},
        settingsCapabilities: { live: ['waitAfterPrompt', 'harness', 'browserMode'], requiresRestart: ['mode'] }, harnessCatalog: featured, agents: [{ name: 'Developer' }],
        tasks: [{ id: 'work', title: 'Actual fixture task', payload: 'A source-controlled description.', status: 'in-progress', priority: 3, source: { relativePath: 'tasks/work.book', revision: 'rev1' }, eligibility: { kind: 'ready', reason: 'Eligible.' } }],
        requests: [{ id: 'choose', prompt: 'Choose the deployment target', reason: 'Human decision.', choices: ['local', 'preview'] }, { id: 'text', prompt: 'Explain your preference', reason: 'Human response.' }], events: [{ type: 'output', message: 'Provider observation' }, { type: 'check', message: 'Check observed' }] };
    const page = await openDashboard(workspace, { token: randomUUID(), snapshot: async () => state, command: async (action, input) => {
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
    let closed = false;
    t.after(async () => { if (!closed) await page.close(); });
    const browser = new ProjectBrowser(workspace, { executable, mode: 'headless' });
    t.after(() => browser.close());
    const tab = await browser.navigate(page.sessionUrl);
    const evaluate = await evaluator(browser, tab);
    t.after(() => evaluate.close());
    await until(() => evaluate.run("document.getElementById('connection').textContent"), value => value === 'Connected');
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

    await evaluate.run("document.querySelector('[data-action=pause]').click()");
    await until(() => evaluate.run("document.getElementById('work-state').textContent"), value => value.startsWith('Pause pending'));
    assert.equal(state.paused, true);
    state = { ...state, paused: false, pausePending: false, running: false };
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.querySelector('[data-action=resume]').disabled"), true, 'Another client changed the same pause state');

    await evaluate.run("document.getElementById('more').click()");
    await until(() => evaluate.run("document.getElementById('catalog').textContent"), value => value.includes('Extra fixture'));
    await evaluate.run("[...document.querySelectorAll('#catalog button')].find(b=>b.textContent==='Extra fixture').click()");
    await until(() => evaluate.run("document.getElementById('harness-detail').textContent"), value => value.includes('reported-model'));

    await evaluate.run("document.querySelector('[data-request=choose] button').click()");
    await until(() => evaluate.run("!!document.querySelector('[data-request=choose]')"), value => !value);
    assert.equal(calls.find(call => call.action === 'answer').input.response, 'preview');
    assert.equal(await evaluate.run("document.querySelector('[data-request=text] textarea').value"), 'Unsubmitted response');
    await evaluate.run("document.getElementById('apply').click()");
    await until(() => evaluate.run("document.getElementById('result').textContent"), value => value.includes('Awaiting safe boundary: waitAfterPrompt'));
    assert.equal(state.settings.waitAfterPrompt, 20, 'The browser does not claim deferred changes have applied');

    await evaluate.run("document.querySelector('#tasks button').click()");
    await until(() => evaluate.run("document.getElementById('task-source').value"), value => value === 'TASK Original fixture');
    await evaluate.run("document.getElementById('task-source').value='TASK My editing draft'");
    state.tasks[0].source.revision = 'rev2';
    await evaluate.run('refresh()');
    assert.match(await evaluate.run("document.getElementById('editor-note').textContent"), /Source changed/);
    await evaluate.run("document.getElementById('save-task').click()");
    await until(() => evaluate.run("document.getElementById('result').textContent"), value => value.includes('Source changed'));
    assert.equal(await evaluate.run("document.getElementById('task-source').value"), 'TASK My editing draft');
    assert.equal(calls.find(call => call.action === 'edit-task').input.revision, 'rev1');

    await page.close(); closed = true;
    await evaluate.run('refresh()');
    assert.equal(await evaluate.run("document.getElementById('connection').textContent"), 'Disconnected');
    assert.match(await evaluate.run("document.getElementById('connection-note').textContent"), /Last snapshot/);
    assert.equal(await evaluate.run("document.querySelector('[data-action=stop]').disabled"), true);
    assert.equal(await evaluate.run("document.querySelector('[data-request=text] textarea').value"), 'Unsubmitted response');
});
