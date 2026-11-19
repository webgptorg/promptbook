import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
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
});
