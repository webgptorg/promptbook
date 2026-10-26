import assert from 'node:assert/strict';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { Agenda } from '../dist/engine/agenda.js';
import { HarnessPool } from '../dist/engine/harnesses.js';
import { harnessPlugin } from '../dist/harness/registry.js';
import { resolveSettings } from '../dist/project/config.js';
import { projectAt } from '../dist/project/workspace.js';
import { fakeHarness, temporaryDirectory } from './helpers.mjs';

/** API instances with an ordered same-variant fallback. */
const TOOLS = ['primary', 'fallback'].map((name) => ({
    type: 'HARNESS', variant: 'CLAUDE_CODE', name, authentication: 'API_KEY',
    apiKey: `\${{ env.${name === 'primary' ? 'KEY' : 'FALLBACK_KEY'} }}`,
}));

/** Isolated installed CLI and file credentials; no provider calls or real login are used. */
async function fixture(t) {
    const root = await temporaryDirectory(t);
    const { env } = await fakeHarness(t, root);
    await copyFile(join(root, 'fake bin', process.platform === 'win32' ? 'codex.cmd' : 'codex'), join(root, 'fake bin', process.platform === 'win32' ? 'claude.cmd' : 'claude'));
    delete env.KEY;
    delete env.FALLBACK_KEY;
    const rotate = (key) => writeFile(join(root, '.env'), `KEY=${key}\nFALLBACK_KEY=fallback-credential\n`);
    await rotate('credential-first');
    const settings = (tools = TOOLS) => resolveSettings({ file: { tools } });
    const pool = new HarnessPool(root, settings(), env);
    await pool.refresh();
    return { root, env, pool, settings, rotate };
}

test('harness refresh: ordinary endpoint edits and equal-length rotation replace readiness; acquired contexts survive', async (t) => {
    const { pool, settings, rotate } = await fixture(t);
    const acquired = pool.context('primary');
    const original = pool.inspectionOf('primary');
    await rotate('credential-other');
    await pool.refresh();
    assert.notEqual(pool.inspectionOf('primary'), original, 'equal-length credentials trigger ordinary reinspection');
    assert.equal(pool.context('primary').env.ANTHROPIC_API_KEY, 'credential-other');
    assert.equal(acquired.env.ANTHROPIC_API_KEY, 'credential-first', 'already acquired runtime context stays intact');
    pool.updateSettings(settings([{ ...TOOLS[0], baseUrl: 'LOCAL' }, TOOLS[1]]));
    assert.equal(pool.select('claude-code', { tool: 'primary' }), undefined, 'new selections cannot borrow inspection from the old endpoint during refresh');
    await pool.refresh();
    assert.equal(pool.inspectionOf('primary').problem, 'unsupported');
    assert.equal(pool.select('claude-code').name, 'fallback');
    assert.equal(pool.select('claude-code', { tool: 'primary' }), undefined);
    assert.equal(acquired.tool.baseUrl, undefined);
    pool.updateSettings(settings());
    await pool.refresh();
    assert.equal(pool.select('claude-code').name, 'primary');
    assert.doesNotMatch(JSON.stringify(pool.all()), /credential-first|credential-other|fallback-credential|identity|fingerprint/);
});

test('harness backoff: unchanged rejected credentials retain bounded marks; replacement and late failures are scoped', async (t) => {
    const { pool, settings, rotate } = await fixture(t);
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    pool.markUnavailable('primary', 'authentication', 'Rejected credential', 60_000);
    pool.invalidate('primary');
    await pool.refresh(undefined, true);
    assert.equal(pool.select('claude-code').name, 'fallback', 'forced inspection cannot validate a rejected key');
    pool.updateSettings(settings([{ ...TOOLS[0], description: 'A cosmetic edit', baseUrl: 'OFFICIAL' }, TOOLS[1]]));
    await pool.refresh();
    assert.equal(pool.inspectionOf('primary').usable, false, 'cosmetic and equivalent endpoint edits retain authentication backoff');
    now += 60_001;
    assert.equal(pool.select('claude-code').name, 'primary', 'unchanged rejected credentials become eligible after bounded authentication backoff');
    pool.markUnavailable('primary', 'authentication', 'Rejected credential', 60_000);
    const acquired = pool.context('primary');
    await rotate('credential-other');
    await pool.refresh();
    assert.equal(pool.select('claude-code').name, 'primary', 'replacement rejected credential recovers immediately');
    pool.markUnavailable('primary', 'authentication', 'Late failure from old use', 60_000, acquired);
    assert.equal(pool.inspectionOf('primary').usable, true, 'old in-flight failure cannot poison replacement readiness');
    pool.markUnavailable('primary', 'authentication', 'Replacement was also rejected', 60_000);
    pool.markUnavailable('primary', 'authentication', 'Another late failure from old use', 60_000, acquired);
    assert.equal(pool.inspectionOf('primary').usable, false, 'old failures cannot overwrite the replacement connection backoff');
    pool.markUnavailable('primary', 'quota', 'Account limit', 60_000);
    pool.updateSettings(settings([{ ...TOOLS[0], description: 'Renamed display text' }, TOOLS[1]]));
    await pool.refresh(undefined, true);
    assert.equal(pool.select('claude-code').name, 'fallback', 'cosmetic edits and forced refresh retain quota backoff');
    now += 60_001;
    assert.equal(pool.select('claude-code').name, 'primary', 'quota recovers at the bounded expiry');
    pool.markUnavailable('primary', 'authentication', 'Rejected again', 60_000);
    await rotate('credential-third');
    await pool.refresh(undefined, true);
    assert.equal(pool.inspectionOf('primary').usable, true, 'forced refresh also recovers a replaced credential');
});

test('harness models: cache follows selected instance, endpoint, credentials and explicit invalidation', async (t) => {
    const { pool, settings, rotate } = await fixture(t);
    const calls = [];
    t.mock.method(harnessPlugin('claude-code'), 'listModels', async (context) => {
        calls.push(context);
        return [`catalog-${calls.length}`];
    });
    assert.deepEqual(await pool.models('claude-code'), ['catalog-1']);
    assert.deepEqual(await pool.models('primary'), ['catalog-1'], 'variant and explicit name share one context cache');
    pool.updateSettings(settings([{ ...TOOLS[0], description: 'Cosmetic' }, TOOLS[1]]));
    await pool.refresh();
    assert.deepEqual(await pool.models('claude-code'), ['catalog-1']);
    await rotate('credential-other');
    await pool.refresh();
    assert.deepEqual(await pool.models('claude-code'), ['catalog-2']);
    pool.markUnavailable('primary', 'quota', 'Account limit', 60_000);
    assert.deepEqual(await pool.models('claude-code'), ['catalog-3']);
    assert.equal(calls[2].tool.name, 'fallback', 'fallback catalog uses its own acquired context');
    pool.updateSettings(settings([{ ...TOOLS[0], baseUrl: 'LOCAL' }, TOOLS[1]]));
    await pool.refresh();
    assert.deepEqual(await pool.models('primary'), ['catalog-4'], 'an endpoint change invalidates that instance catalog');
    pool.invalidate('fallback');
    await pool.refresh();
    assert.deepEqual(await pool.models('claude-code'), ['catalog-5']);
    await pool.refresh(undefined, true);
    assert.deepEqual(await pool.models('claude-code'), ['catalog-6'], 'readiness rechecks also refresh CLI-dependent model discovery');
});

test('engine live refresh path: .env and ptbk.json edits update the shared pool and inventory', async (t) => {
    const { root, env, rotate } = await fixture(t);
    const project = projectAt(root);
    for (const path of ['agents', 'tasks', 'chats']) await mkdir(join(root, path));
    const save = (tools) => writeFile(project.configPath, JSON.stringify({ promptbookVersion: '0.119.0-35', tools }));
    await save(TOOLS);
    const agenda = new Agenda({ project, env, mode: 'foreground', instanceId: 'refresh-fixture', cli: {}, persistent: false });
    // Invoke the shared refreshLive -> refreshTools path used by a running engine after file-change notification.
    await agenda.refreshLive();
    const pool = agenda.pool;
    assert.equal(pool.select('claude-code')?.name, 'primary', JSON.stringify(pool.all()));
    const acquired = pool.context('primary');
    pool.markUnavailable('primary', 'authentication', 'Rejected credential', 60_000);
    await rotate('credential-other');
    await agenda.refreshLive();
    assert.equal(pool.select('claude-code')?.name, 'primary');
    assert.equal(agenda.pool, pool, 'engine refresh reuses its existing pool without restart');
    assert.equal(pool.context('primary').env.ANTHROPIC_API_KEY, 'credential-other');
    assert.equal(acquired.env.ANTHROPIC_API_KEY, 'credential-first');
    await save([{ ...TOOLS[0], baseUrl: 'LOCAL' }, TOOLS[1]]);
    await agenda.refreshLive();
    assert.equal(pool.inspectionOf('primary')?.problem, 'unsupported');
    assert.equal(pool.select('claude-code').name, 'fallback');
    const inventory = agenda.tools;
    assert.doesNotMatch(JSON.stringify(inventory), /credential-first|credential-other|fallback-credential|fingerprint/);
});
