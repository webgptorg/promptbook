import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { PtbkError } from '../dist/common/errors.js';
import { gitOrThrow, gitStatus } from '../dist/project/git.js';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

/** Fail selected native Git invocations through a real child process, restoring every other operation unchanged. */
function failingGit(command, failures, run, mode = 'exit') {
    const spawn = childProcess.spawn;
    let calls = 0;
    childProcess.spawn = (executable, args, options) => {
        if (args[0] === command && ++calls <= failures) {
            const child = spawn(process.execPath, ['-e', mode === 'terminate' ? 'setInterval(() => {}, 1000);' : 'process.stderr.write("fixture native Git read failure\\n"); process.exit(1);'], options);
            if (mode === 'terminate') child.once('spawn', () => child.kill());
            return child;
        }
        return spawn(executable, args, options);
    };
    syncBuiltinESMExports();
    return Promise.resolve().then(() => run(() => calls)).finally(() => {
        childProcess.spawn = spawn;
        syncBuiltinESMExports();
    });
}

test('Git status: a transient native read failure retries the snapshot and preserves staged and untracked work', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk status retry');
    await initRepository(root);
    await writeFile(join(root, 'staged.txt'), 'staged user content\n');
    await git(root, ['add', 'staged.txt']);
    await writeFile(join(root, 'untracked.txt'), 'untracked user content\n');
    const staged = await git(root, ['diff', '--cached']);
    await failingGit('status', 1, async (calls) => {
        const entries = await gitStatus(root, root);
        assert.equal(calls(), 2);
        assert.ok(entries.some((entry) => entry.path === join(root, 'staged.txt') && entry.index === 'A'));
        assert.ok(entries.some((entry) => entry.path === join(root, 'untracked.txt') && entry.index === '?'));
    });
    assert.equal(await git(root, ['diff', '--cached']), staged, 'reading status never changes the index');
    assert.equal(await readFile(join(root, 'untracked.txt'), 'utf8'), 'untracked user content\n');
});

test('Git status: a persistent native read failure remains a bounded failure with its actual cause', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk status permanent');
    await initRepository(root);
    await failingGit('status', Infinity, async (calls) => {
        await assert.rejects(gitStatus(root, root), (error) => error instanceof PtbkError && error.details.phase === 'git status' && /fixture native Git read failure/.test(error.details.reason));
        assert.equal(calls(), 3);
    });
});

test('Git status recovery never retries a mutating Git command', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk status mutation');
    await initRepository(root);
    await writeFile(join(root, 'keep.txt'), 'user work\n');
    await failingGit('add', 1, async (calls) => {
        await assert.rejects(gitOrThrow(root, ['add', 'keep.txt']), /git add failed/);
        assert.equal(calls(), 1, 'a failed mutation is surfaced without an implicit repeat');
    });
    assert.equal(await git(root, ['diff', '--cached']), '');
    assert.equal(await readFile(join(root, 'keep.txt'), 'utf8'), 'user work\n');
});

test('Git status: a terminated read is surfaced without starting another process', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk status terminated');
    await initRepository(root);
    await failingGit('status', 1, async (calls) => {
        await assert.rejects(gitStatus(root, root), (error) => error instanceof PtbkError && Boolean(error.details.data?.signal));
        assert.equal(calls(), 1);
    }, 'terminate');
});
