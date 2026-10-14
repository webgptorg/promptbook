import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, realpath, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFiniteRuntime } from '../dist/coder/finite.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { ProjectBrowser } from '../dist/coder/browser.js';
import { createRequest, listRequests } from '../dist/coder/requests.js';

/** Close the finite runtime and drain its reads before removing the isolated project. */
async function fixture(t, options = {}, cancel = () => {}) {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-finite-ui-')));
    let runtime;
    t.after(async () => {
        try { await runtime?.close(); }
        finally { await rm(directory, { recursive: true, force: true }); }
    });
    const workspace = await resolveWorkspace({ path: directory });
    runtime = await createFiniteRuntime(workspace, options, cancel);
    return { workspace, runtime };
}

test('finite page shares real version and controls and closes with its invocation', async t => {
    let stopped = false;
    const { runtime } = await fixture(t, { interactive: false, noServer: false, noTunnel: true }, () => { stopped = true; });
    const state = await runtime.control.snapshot();
    const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
    assert.equal(state.engineVersion, version);
    assert.equal(state.lifetime, 'finite');
    assert.equal(state.currentTask, undefined);
    assert.equal(state.statistics.completed, 0);
    const address = new URL(state.url);
    assert.equal(address.hash, '', 'Ordinary state must not include credentials');
    const html = await (await fetch(address.origin)).text();
    assert.doesNotThrow(() => new Function(/<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)[1]));
    assert.equal(html.includes(runtime.control.token), false);
    assert.equal((await fetch(address.origin + '/api/state')).status, 403);
    const headers = { Origin: address.origin, 'X-Ptbk-Token': runtime.control.token, 'Content-Type': 'application/json' };
    const pause = await fetch(address.origin + '/api/control', { method: 'POST', headers, body: '{"action":"pause"}' });
    assert.equal(pause.status, 200);
    assert.equal(runtime.options.isPaused(), true);
    await runtime.control.command('resume');
    assert.equal(runtime.options.isPaused(), false);
    assert.equal((await runtime.control.command('skip-wait')).skipped, false);
    runtime.options.onWait(true);
    assert.equal((await runtime.control.command('skip-wait')).skipped, true);
    assert.equal(runtime.options.skipWait(), true);
    assert.equal(runtime.options.skipWait(), false);
    runtime.options.onWait(false);
    const changed = await runtime.control.command('settings', { settings: { model: 'next-model' } });
    assert.equal(changed.requiresRestart.model, 'next-model');
    assert.equal(runtime.options.model, undefined);
    assert.equal(changed.savedDefaults, false);
    const pacing = await runtime.control.command('settings', { settings: { waitAfterPrompt: 4321 } });
    assert.equal(pacing.pending.waitAfterPrompt, 4321);
    assert.equal(runtime.options.waitAfterPrompt, undefined);
    await runtime.options.onTaskBoundary(runtime.options);
    assert.equal(runtime.options.waitAfterPrompt, 4321);
    assert.deepEqual((await runtime.control.snapshot()).pendingSettings, {});
    await assert.rejects(runtime.control.command('settings', { settings: { allowCredits: 'yes' } }), /boolean/);
    await runtime.control.command('stop');
    assert.equal(stopped, true);
    await runtime.complete({ completed: 0, failed: 0, skipped: 0, commits: [], exitCode: 0, events: [], nextWakeUp: 9999999999999 });
    assert.equal((await runtime.control.snapshot()).status, 'completed');
    await runtime.close();
    await assert.rejects(fetch(address.origin));
    await assert.rejects(runtime.control.command('pause'), /finished/);
});

test('finite HTTP closes even when browser cleanup fails', async t => {
    const { runtime } = await fixture(t, { noServer: false, noTunnel: true });
    const address = new URL((await runtime.control.snapshot()).url);
    const original = ProjectBrowser.prototype.close;
    ProjectBrowser.prototype.close = async () => { throw new Error('Observed browser cleanup failure'); };
    try { await assert.rejects(runtime.close(), /Observed browser cleanup failure/); }
    finally { ProjectBrowser.prototype.close = original; await runtime.close(); }
    await assert.rejects(fetch(address.origin), 'The completed finite invocation cannot leave its HTTP server alive');
});

test('finite activity distinguishes unclaimed work from actual task routing and recovery diagnostics', async t => {
    const { runtime } = await fixture(t);
    runtime.options.onEvent({ type: 'waiting-until', taskId: 'future', message: 'Future work', time: 1 });
    assert.equal((await runtime.control.snapshot()).running, false);
    runtime.options.onEvent({ type: 'selection', taskId: 'active', message: 'Observed routing', time: 2, agent: '/actual/developer.book', harness: 'claude-code', model: 'observed-model', thinkingLevel: 'high' });
    let state = await runtime.control.snapshot();
    assert.equal(state.running, true); assert.equal(state.currentSelection.model, 'observed-model');
    runtime.options.onEvent({ type: 'error', taskId: 'active', message: 'Git persistence failed', time: 3, trace: '.ptbk/existing-task-trace.md', nextAction: 'Inspect the preserved task journal' });
    state = await runtime.control.snapshot();
    assert.equal(state.error, 'Git persistence failed'); assert.equal(state.diagnostic, '.ptbk/existing-task-trace.md');
    assert.match(state.nextAction, /preserved task journal/);
});

test('finite dashboards publish controls and distinguish graceful finish from owned cancellation', async t => {
    let cancelled = 0;
    const { runtime } = await fixture(t, {}, () => cancelled++);
    assert.equal((await runtime.control.snapshot()).finishAfterTask, false);
    assert.deepEqual((await runtime.control.snapshot()).controlCapabilities.actions, ['inspect', 'pause', 'resume', 'skip-wait', 'finish', 'stop', 'answer', 'settings', 'harnesses']);
    const first = await runtime.control.command('finish');
    assert.equal(first.finishAfterTask, true);
    assert.equal(first.cancellationRequested, false);
    assert.equal(cancelled, 0);
    assert.equal((await runtime.control.snapshot()).finishAfterTask, true);
    const second = await runtime.control.command('finish');
    assert.equal(second.cancellationRequested, true);
    assert.equal(cancelled, 1);
    assert.equal(runtime.options.shouldStop(), true);
    const featured = await runtime.control.command('harnesses');
    const more = await runtime.control.command('harnesses', { more: true });
    assert(featured.every(item => item.featured));
    assert(more.length >= featured.length);
    assert.equal((await runtime.control.command('harnesses', { name: more[0].name })).name, more[0].name);
});

test('finite manual confirmations use labeled choices with decline initially focused', async t => {
    const { runtime } = await fixture(t, { interactive: true, noAuto: true });
    const decisions = ['yes', 'no']; const labels = [];
    runtime.terminal.question = async () => assert.fail('Predefined confirmations must not open the text composer.');
    runtime.terminal.choose = async (label, choices, initial) => {
        labels.push(label);
        assert.equal(initial, 'no');
        assert.deepEqual(choices.map(choice => choice.label), ['Yes, continue', 'No, decline']);
        return decisions.shift();
    };
    assert.equal(await runtime.options.confirm('task', 'Execute the reviewed task?'), true);
    assert.equal(await runtime.options.confirm('commit', 'Commit the accepted result?'), false);
    assert.deepEqual(labels, ['Execute the reviewed task?', 'Commit the accepted result?']);
});

/** Minimal DOM objects allow the delivered dashboard script to be exercised without a browser dependency. */
function dashboardDocument() {
    const nodes = new Map();
    /** Preserve the element tree and mutable form state consumed by browser event handlers. */
    const createElement = tag => ({
        tagName: tag.toUpperCase(), textContent: '', value: '', children: [], attributes: {}, dataset: {}, style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } },
        replaceChildren(...children) { this.children = []; this.append(...children); },
        setAttribute(name, value) { this.attributes[name] = value; },
        get firstChild() { return this.children[0]; },
        get childNodes() { return this.children; },
        remove() { this.parent.children = this.parent.children.filter(child => child !== this); },
    });
    return {
        createElement, createElementNS: (namespaceURI, tag) => ({ ...createElement(tag), namespaceURI }), querySelectorAll: () => [], body: createElement('body'),
        createTextNode: textContent => ({ textContent }),
        getElementById(id) { if (!nodes.has(id)) nodes.set(id, createElement('div')); return nodes.get(id); },
    };
}

test('dashboard requests expose predefined answers without applying an implicit default', async t => {
    const { workspace, runtime } = await fixture(t, { noServer: false, noTunnel: true });
    const request = await createRequest(workspace, { kind: 'question', reason: 'Select a destination.', prompt: 'Where should the output go?', choices: ['Current folder', '<new project>'] });
    const open = await createRequest(workspace, { kind: 'question', reason: 'Describe the work.', prompt: 'What should change?' });
    const address = new URL((await runtime.control.snapshot()).url);
    const html = await (await fetch(address.origin)).text();
    const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)[1];
    const document = dashboardDocument();
    /** Use the real finite control model while replacing the browser's relative fetch transport. */
    const transport = async (url, options) => ({ ok: true, json: async () => {
        if (url === '/api/state') return runtime.control.snapshot();
        if (url === '/api/connection') return { url: address.href, size: 1, modules: [1] };
        const { action, ...input } = JSON.parse(options.body);
        return runtime.control.command(action, input);
    } });
    /** Native options retain literal labels and explicit placeholder selection in the fake DOM. */
    function Option(text, value, defaultSelected = false, selected = false) {
        const option = document.createElement('option');
        Object.assign(option, { textContent: text, value, defaultSelected, selected });
        return option;
    }
    const refresh = new Function('document', 'location', 'history', 'fetch', 'setInterval', 'Option', `${script}\nreturn async () => { while (client.busy || client.refreshing) await new Promise(resolve => setTimeout(resolve, 1)); await refresh(); };`)(document, address, { replaceState() {} }, transport, () => {}, Option);
    await refresh();
    const cards = document.getElementById('requests').children;
    const chosen = cards.find(card => card.firstChild.textContent.endsWith(request.prompt));
    const [prompt, reason, answer, submit] = chosen.children;
    assert.equal(prompt.textContent, 'User · ' + request.prompt);
    assert.match(reason.textContent, /Select a destination/);
    assert.equal(answer.tagName, 'SELECT');
    assert.deepEqual(answer.children.slice(1).map(option => option.textContent), request.choices);
    assert.equal(answer.children[0].disabled, true);
    assert.equal(answer.children[0].selected, true);
    assert.equal(submit.disabled, true);
    assert.equal(cards.find(card => card.firstChild.textContent.endsWith(open.prompt)).children[2].tagName, 'TEXTAREA');
    assert.equal((await listRequests(workspace, true)).length, 2);
    answer.value = '<new project>';
    answer.onchange();
    await refresh();
    assert.equal(answer.value, '<new project>');
    assert.equal(submit.disabled, false);
    await submit.onclick();
    await refresh();
    assert.equal((await listRequests(workspace)).find(item => item.id === request.id).response, '<new project>');
    assert.equal((await listRequests(workspace, true)).length, 1);
    assert.equal(document.getElementById('requests').children.length, 1);
});
