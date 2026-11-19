import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { awaitCommitCheck } from '../scripts/await-commit-check.mjs';
import { selectTestShard } from '../scripts/test.mjs';
import { isAlreadyPublished } from '../scripts/verify-published.mjs';
import { ROOT } from './helpers.mjs';

/** Reads the `scripts` of the package.json in `directory` (relative to the repository root). */
async function scriptsOf(directory) {
    return JSON.parse(await readFile(join(ROOT, directory, 'package.json'), 'utf8')).scripts ?? {};
}

test('every npm script that a GitHub workflow runs exists in the package it targets', async () => {
    // A stale merge once dropped `test:browser` from package.json: every release then failed in the native-browser
    // job with "Missing script", long after the change that caused it.
    const workflows = (await readdir(join(ROOT, '.github', 'workflows'))).filter((name) => name.endsWith('.yml'));
    assert.ok(workflows.includes('publish.yml') && workflows.includes('check.yml'));
    let references = 0;
    for (const workflow of workflows) {
        const content = await readFile(join(ROOT, '.github', 'workflows', workflow), 'utf8');
        for (const [, prefix = '.', command, script] of content.matchAll(/\bnpm (?:--prefix ([\w./-]+) )?(run|test)\b(?: ([\w:.-]+))?/g)) {
            const name = command === 'test' ? 'test' : script;
            assert.ok(name, `${workflow}: \`npm run\` without a script name`);
            assert.ok(Object.hasOwn(await scriptsOf(prefix), name), `${workflow} runs the missing npm script "${name}" of ${join(prefix, 'package.json')}`);
            references++;
        }
    }
    assert.ok(references > 10, 'the workflows were actually inspected');
});

test('every script and test file that a root npm script starts with node exists', async () => {
    for (const [name, command] of Object.entries(await scriptsOf('.'))) {
        for (const [, file] of command.matchAll(/(?:^|\s)((?:scripts|test|extensions)\/[\w./-]+\.m?js)\b/g)) {
            assert.ok(existsSync(join(ROOT, file)), `npm script "${name}" references the missing file ${file}`);
        }
    }
});

test('a repeated release publication recognizes the exact version npm already serves and is never confused by other errors', async () => {
    const release = { version: '1.2.3-4', tag: 'latest' };
    const served = { version: '1.2.3-4', 'dist.tarball': 'https://registry.npmjs.org/ptbk/-/ptbk-1.2.3-4.tgz', 'dist.integrity': 'sha512-AAAA', 'dist-tags': {} };
    const npmError = (code) => Object.assign(new Error(`npm error code ${code}`), { stderr: `npm error code ${code}` });
    assert.equal(await isAlreadyPublished(release, { readMetadata: async () => served }), true);
    assert.equal(await isAlreadyPublished(release, { readMetadata: async () => { throw npmError('E404'); } }), false);
    await assert.rejects(isAlreadyPublished(release, { readMetadata: async () => { throw npmError('E401'); } }), /E401/, 'an authentication failure is not "not published"');
    await assert.rejects(isAlreadyPublished(release, { readMetadata: async () => ({ ...served, 'dist.tarball': 'https://example.test/other.tgz' }) }), /tarball/, 'a different artifact is never accepted as this release');
});

test('the sharded test suite runs every test file exactly once, in shards of similar duration', async () => {
    const files = (await readdir(join(ROOT, 'test'))).filter((name) => name.endsWith('.test.mjs')).sort().map((name) => `test/${name}`);
    const durations = JSON.parse(await readFile(join(ROOT, 'scripts', 'test-durations.json'), 'utf8'));
    for (const file of Object.keys(durations)) assert.ok(files.includes(file), `scripts/test-durations.json lists the missing test file ${file}`);
    for (const count of [1, 2, 4]) {
        const shards = Array.from({ length: count }, (_, index) => selectTestShard(files, { index: index + 1, count, durations }));
        assert.deepEqual(shards.flat().sort(), files, `${count} shards together run every file once`);
        const totals = shards.map((shard) => shard.reduce((sum, file) => sum + (durations[file] ?? 0), 0));
        assert.ok(Math.max(...totals) - Math.min(...totals) <= Math.max(...Object.values(durations)), `${count} shards are balanced: ${totals}`);
    }
    const headStart = 300;
    const withHeadStart = Array.from({ length: 5 }, (_, index) => selectTestShard(files, { index: index + 1, count: 5, durations, headStart }));
    assert.deepEqual(withHeadStart.flat().sort(), files, 'a head start keeps every file in exactly one shard');
    const testSeconds = withHeadStart.map((shard) => shard.reduce((sum, file) => sum + (durations[file] ?? 0), 0));
    assert.ok(testSeconds[0] < Math.min(...testSeconds.slice(1)), `the first shard, which does other work too, gets fewer tests: ${testSeconds}`);
});

test('a publication reuses only a passing check run of its exact commit, re-runs a failed one once, and otherwise validates the tag itself', async () => {
    /** Simulates the runs the API lists over time; each poll advances the clock by the requested pause. */
    const scenario = async (timeline, options = {}) => {
        let clock = 0;
        let poll = 0;
        const reruns = [];
        const result = await awaitCommitCheck({
            listRuns: async () => structuredClone(timeline[Math.min(poll++, timeline.length - 1)]),
            rerunFailedJobs: async (id) => { reruns.push(id); },
            sleep: async (ms) => { clock += ms; },
            now: () => clock,
            ...options,
        });
        return { ...result, reruns };
    };
    const run = (id, status, conclusion = null, { created_at = '2026-11-19T12:00:00Z', run_attempt = 1 } = {}) => ({ id, status, conclusion, created_at, run_attempt, html_url: `https://example.test/runs/${id}` });
    const unusable = { passed: false, failed: false, runId: undefined, reruns: [] };
    assert.deepEqual(await scenario([[], [run(7, 'queued')], [run(7, 'in_progress')], [run(7, 'completed', 'success')]]), { passed: true, failed: false, runId: '7', reruns: [] });
    assert.deepEqual(await scenario([[run(7, 'completed', 'cancelled')]]), unusable, 'a superseded branch run is not reused');
    assert.deepEqual(await scenario([[]], { appearanceTimeoutMs: 60_000 }), unusable, 'no branch run: the tag is validated');
    assert.deepEqual(await scenario([[run(7, 'in_progress')]], { completionTimeoutMs: 60_000 }), unusable, 'a hung branch run does not block forever');
    const failed = run(7, 'completed', 'failure');
    assert.deepEqual(
        await scenario([[failed], [failed], [run(7, 'queued', null, { run_attempt: 2 })], [run(7, 'completed', 'success', { run_attempt: 2 })]]),
        { passed: true, failed: false, runId: '7', reruns: [7] },
        'a failed run gets one re-run of its failed jobs, and the still-listed replaced attempt is not taken for its result',
    );
    assert.deepEqual(await scenario([[failed], [run(7, 'completed', 'failure', { run_attempt: 2 })]]), { passed: false, failed: true, runId: undefined, reruns: [7] }, 'failing again fails the publication');
    const newer = [run(7, 'completed', 'failure'), run(8, 'completed', 'success', { created_at: '2026-11-19T12:30:00Z' })];
    assert.deepEqual(await scenario([newer]), { passed: true, failed: false, runId: '8', reruns: [] }, 'the newest run of the commit decides');
});
