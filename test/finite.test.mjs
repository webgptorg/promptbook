import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, realpath, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFiniteRuntime } from '../dist/coder/finite.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { ProjectBrowser } from '../dist/coder/browser.js';

/** Empty isolated projects let shared presentation be tested without a harness or model call. */
async function fixture(t) {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-finite-ui-')));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return resolveWorkspace({ path: directory });
}

test('finite page shares real version and controls and closes with its invocation', async t => {
    const workspace = await fixture(t);
    let stopped = false;
    const runtime = await createFiniteRuntime(workspace, { interactive: false, noServer: false }, () => { stopped = true; });
    t.after(() => runtime.close());
    const state = await runtime.control.snapshot();
    const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
    assert.equal(state.engineVersion, version);
    assert.equal(state.lifetime, 'finite');
    assert.equal(state.currentTask, undefined);
    assert.equal(state.statistics.completed, 0);
    const address = new URL(state.url);
    assert.equal(address.hash.slice(1), runtime.control.token);
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
    const workspace = await fixture(t);
    const runtime = await createFiniteRuntime(workspace, { noServer: false }, () => {});
    const address = new URL((await runtime.control.snapshot()).url);
    const original = ProjectBrowser.prototype.close;
    ProjectBrowser.prototype.close = async () => { throw new Error('Observed browser cleanup failure'); };
    try { await assert.rejects(runtime.close(), /Observed browser cleanup failure/); }
    finally { ProjectBrowser.prototype.close = original; await runtime.close(); }
    await assert.rejects(fetch(address.origin), 'The completed finite invocation cannot leave its HTTP server alive');
});

test('finite activity distinguishes unclaimed work from actual task routing and recovery diagnostics', async t => {
    const workspace = await fixture(t);
    const runtime = await createFiniteRuntime(workspace, {}, () => {});
    t.after(() => runtime.close());
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
