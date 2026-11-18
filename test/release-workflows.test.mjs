import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
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
