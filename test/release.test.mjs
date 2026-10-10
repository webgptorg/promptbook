import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateRelease } from '../scripts/validate-release.mjs';
import { assertPublishedMetadata } from '../scripts/verify-published.mjs';
import { parseBook, parseMarkdown } from '../dist/coder/sources.js';
import { assertPublishContext } from '../scripts/assert-publish-context.mjs';

/** Executes the installed entry point and fixture-only Git operations. */
const EXECUTE = promisify(execFile);
/** Entry point stays outside the disposable projects used by these regressions. */
const CLI = resolve('bin/ptbk.js');

/** Builds an unborn Git repository with explicit test identity. */
async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), 'ptbk-release-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await EXECUTE('git', ['init', '--quiet'], { cwd: root });
    await EXECUTE('git', ['config', 'user.name', 'Release fixture'], { cwd: root });
    await EXECUTE('git', ['config', 'user.email', 'fixture@example.test'], { cwd: root });
    await EXECUTE('git', ['config', 'commit.gpgsign', 'false'], { cwd: root });
    return root;
}

test('release manifest and lockfile use only ptbk and regular prereleases install through latest', async () => {
    const release = await validateRelease();
    assert.match(release.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    assert.equal(release.tag, 'latest');
    await validateRelease(`v${release.version}`);
    await assert.rejects(validateRelease('v0.1.0'), /must match/);
});

test('publication requires the GitHub Actions repository and release tag', () => {
    assert.throws(() => assertPublishContext({}), /through GitHub Actions/);
    assert.throws(() => assertPublishContext({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'someone/fork', RELEASE_TAG: 'v0.115.0-1' }), /through GitHub Actions/);
    assert.throws(() => assertPublishContext({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'webgptorg/promptbook' }), /through GitHub Actions/);
    assertPublishContext({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'webgptorg/promptbook', RELEASE_TAG: 'v0.115.0-1' });
});

test('release verification rejects a missing or incorrectly tagged registry artifact', () => {
    const release = { version: '0.115.0-0', tag: 'latest' };
    const metadata = { version: release.version, 'dist-tags': { latest: release.version }, 'dist.tarball': `https://registry.npmjs.org/ptbk/-/ptbk-${release.version}.tgz`, 'dist.integrity': `sha512-${Buffer.alloc(64).toString('base64')}` };
    assertPublishedMetadata(release, metadata);
    assert.throws(() => assertPublishedMetadata(release, { ...metadata, version: '0.114.0-50' }), /registry version/);
    assert.throws(() => assertPublishedMetadata(release, { ...metadata, 'dist-tags': { next: release.version } }), /latest dist-tag/);
    assert.throws(() => assertPublishedMetadata(release, { ...metadata, 'dist.tarball': undefined }), /tarball/);
    assert.throws(() => assertPublishedMetadata(release, { ...metadata, 'dist.integrity': undefined }), /integrity/);
});

test('published guide task examples are valid input for the runtime source adapters', async () => {
    const guide = await readFile(new URL('../docs/coder.md', import.meta.url), 'utf8');
    const examples = [...guide.matchAll(/^```(book|markdown)\n([\s\S]*?)^```$/gm)];
    assert(examples.length >= 2, 'The guide must contain Book and legacy task examples.');
    for (const [index, example] of examples.entries()) {
        const filename = `/tmp/ptbk-guide/example-${index}.${example[1] === 'book' ? 'book' : 'md'}`;
        const tasks = example[1] === 'book' ? [parseBook(example[2], filename, 'UTC')] : parseMarkdown(example[2], filename, 'UTC');
        assert.equal(tasks.length, 1);
        assert(tasks[0], 'A task example cannot be an agent Book.');
        assert.deepEqual(tasks[0].diagnostics, []);
        assert.equal(tasks[0].status, 'todo');
    }
});

test('init and add explicit commits include created artifacts without claiming unrelated unborn files', async t => {
    const root = await fixture(t);
    await writeFile(join(root, 'user.txt'), 'Existing untracked work\n');
    await EXECUTE(process.execPath, [CLI, 'init', '--commit', '--no-questions'], { cwd: root });
    const tracked = await EXECUTE('git', ['ls-tree', '--name-only', '-r', 'HEAD'], { cwd: root });
    assert(tracked.stdout.includes('agents/developer.book'));
    assert(!tracked.stdout.includes('user.txt'));
    assert(!tracked.stdout.includes('.promptbook'));
    await EXECUTE(process.execPath, [CLI, 'add', 'Scoped authored task', '--commit'], { cwd: root });
    const subject = await EXECUTE('git', ['show', '--format=', '--name-only', 'HEAD'], { cwd: root });
    assert.match(subject.stdout, /tasks\/.*\.book/);
    assert.equal(await readFile(join(root, 'user.txt'), 'utf8'), 'Existing untracked work\n');
    const status = await EXECUTE('git', ['status', '--porcelain'], { cwd: root });
    assert.equal(status.stdout.trim(), '?? user.txt');
});

test('real CLI migration commits the source deletion and exact archived bytes in one scoped commit', async t => {
    const root = await fixture(t);
    await mkdir(join(root, 'prompts'));
    const original = '[ ] !! `gpt`\r\n\r\nMigrate fixture\r\nLiteral MODEL and Unicode 🐙\r\n';
    await writeFile(join(root, 'prompts', 'fixture.md'), original);
    await writeFile(join(root, '.gitignore'), '.promptbook/\n');
    await EXECUTE('git', ['add', '--', '.gitignore', 'prompts/fixture.md'], { cwd: root });
    await EXECUTE('git', ['commit', '-qm', 'Fixture source'], { cwd: root });
    await EXECUTE(process.execPath, [CLI, 'migrate', '--no-questions'], { cwd: root });
    const changed = await EXECUTE('git', ['show', '--format=', '--name-status', '--no-renames', 'HEAD'], { cwd: root });
    assert.match(changed.stdout, /D\s+prompts\/fixture.md/);
    assert.match(changed.stdout, /A\s+tasks\/fixture-1.book/);
    const archives = await readdir(join(root, 'prompts', 'migrated'));
    assert.equal(archives.length, 1);
    assert.equal(await readFile(join(root, 'prompts', 'migrated', archives[0]), 'utf8'), original);
    const head = await EXECUTE('git', ['rev-parse', 'HEAD'], { cwd: root });
    await EXECUTE(process.execPath, [CLI, 'migrate', '--no-questions'], { cwd: root });
    assert.equal((await EXECUTE('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout, head.stdout);
    assert.equal((await EXECUTE('git', ['status', '--porcelain'], { cwd: root })).stdout, '');
});
