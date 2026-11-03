import assert from 'node:assert/strict';
import { readFile, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

test('fixture Git observation never refreshes the shared index while engine commits may be running', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk git observation');
    await initRepository(directory);
    const path = join(directory, 'tracked.txt');
    await writeFile(path, 'unchanged content\n');
    await git(directory, ['add', '.']);
    await git(directory, ['commit', '-qm', 'Base']);
    const before = await readFile(join(directory, '.git', 'index'));
    // An unchanged file with new filesystem metadata invites `git status` to refresh the index unless disabled.
    const changedTime = new Date(Date.now() + 60_000);
    await utimes(path, changedTime, changedTime);
    assert.equal((await git(directory, ['status', '--porcelain'])).trim(), '');
    assert.deepEqual(await readFile(join(directory, '.git', 'index')), before, 'a status observer never takes an optional index-writing lock');
});
