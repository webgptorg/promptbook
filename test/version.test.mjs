import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

/** Real Git/npm commands are confined to disposable repositories and local remotes. */
const execute = promisify(execFile);
/** Invoke npm's JavaScript entry point on every OS, avoiding Windows shell shims. */
const npmCli = process.env.npm_execpath;
/** Reuse the actual release lifecycle configuration rather than restating it in fixtures. */
const original = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

/** Construct an isolated version checkout with deterministic checks and a local bare origin. */
async function fixture(t) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk version '));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const checkout = join(directory, 'checkout');
    const remote = join(directory, 'remote.git');
    await mkdir(checkout);
    await mkdir(join(checkout, 'scripts'));
    await mkdir(join(checkout, 'bin'));
    for (const name of ['preversion.mjs', 'postversion.mjs', 'validate-release.mjs']) {
        await copyFile(new URL(`../scripts/${name}`, import.meta.url), join(checkout, 'scripts', name));
    }
    const manifest = { ...original, version: '1.0.0', devDependencies: {}, scripts: { ...original.scripts, typecheck: 'node checks.mjs' } };
    await writeFile(join(checkout, 'package.json'), JSON.stringify(manifest, null, 2));
    await writeFile(join(checkout, 'package-lock.json'), JSON.stringify({ name: 'ptbk', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'ptbk', version: '1.0.0', bin: manifest.bin } } }, null, 2));
    // The hook contract is under test; a controlled substitute makes check failure deterministic.
    await writeFile(join(checkout, 'checks.mjs'), 'console.log("fixture basic checks ran"); process.exitCode = process.env.PTBK_FIXTURE_FAIL_CHECK ? 1 : 0;\n');
    await writeFile(join(checkout, 'bin', 'ptbk.js'), '#!/usr/bin/env node\n');
    await writeFile(join(checkout, 'fixture.txt'), 'baseline\n');
    await writeFile(join(directory, 'npmrc'), '');
    const env = {
        ...process.env,
        RELEASE_TAG: '',
        npm_config_userconfig: join(directory, 'npmrc'),
        npm_config_sign_git_tag: 'false',
        npm_config_git_tag_version: 'true',
        npm_config_tag_version_prefix: 'v',
        GIT_CONFIG_NOSYSTEM: '1',
    };
    const git = async (args, cwd = checkout) => (await execute('git', args, { cwd, env, timeout: 15_000 })).stdout.trim();
    const npm = (args, extraEnv = {}) => execute(process.execPath, [npmCli, ...args], { cwd: checkout, env: { ...env, ...extraEnv }, timeout: 30_000 });
    await git(['init', '-q', '-b', 'release']);
    await git(['config', 'user.name', 'Release fixture']);
    await git(['config', 'user.email', 'fixture@example.test']);
    await git(['config', 'commit.gpgsign', 'false']);
    await git(['config', 'tag.gpgsign', 'false']);
    await git(['config', 'core.hooksPath', join(directory, 'no-hooks')]);
    await git(['add', '.']);
    await git(['commit', '-qm', 'fixture baseline']);
    await git(['init', '--bare', '-q', remote]);
    await git(['remote', 'add', 'origin', remote]);
    await git(['push', '-qu', 'origin', 'release']);
    return { directory, checkout, remote, git, npm, env };
}

test('npm version checks first, commits matching metadata and pushes exactly the branch and release tag', async (t) => {
    const f = await fixture(t);
    await f.git(['tag', 'unrelated-local-tag']);
    const bumped = await f.npm(['version', 'patch']);
    assert.match(bumped.stdout, /fixture basic checks ran/);
    const head = await f.git(['rev-parse', 'HEAD']);
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), head);
    assert.equal(await f.git(['rev-parse', 'refs/tags/v1.0.1^{commit}'], f.remote), head);
    assert.equal(await f.git(['tag', '--list'], f.remote), 'v1.0.1');
    assert.equal(JSON.parse(await f.git(['show', 'HEAD:package.json'])).version, '1.0.1');
    assert.equal(JSON.parse(await f.git(['show', 'HEAD:package-lock.json'])).packages[''].version, '1.0.1');
    assert.equal(await f.git(['status', '--porcelain']), '');
});

test('postversion respects an upstream with a different branch name', async (t) => {
    const f = await fixture(t);
    await f.git(['push', '-qu', 'origin', 'release:shipping']);
    const oldRelease = await f.git(['rev-parse', 'refs/heads/release'], f.remote);
    await f.npm(['version', 'prerelease']);
    assert.equal(await f.git(['rev-parse', 'refs/heads/shipping'], f.remote), await f.git(['rev-parse', 'HEAD']));
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), oldRelease);
    assert.equal(await f.git(['tag', '--list'], f.remote), 'v1.0.1-0');
});

test('failed atomic push preserves local version and tag, and postversion retries without bumping', async (t) => {
    const f = await fixture(t);
    const baseline = await f.git(['rev-parse', 'HEAD']);
    // A conflicting remote tag makes the atomic push reject the branch update as well.
    await f.git(['tag', 'v1.0.1', baseline], f.remote);
    await assert.rejects(f.npm(['version', 'patch']), error => {
        assert.match(error.stderr, /Release push failed/);
        return true;
    });
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), baseline);
    assert.equal(await f.git(['rev-parse', 'refs/tags/v1.0.1'], f.remote), baseline);
    const versionHead = await f.git(['rev-parse', 'HEAD']);
    assert.notEqual(versionHead, baseline);
    assert.equal(await f.git(['rev-parse', 'v1.0.1^{commit}']), versionHead);
    await f.git(['tag', '-d', 'v1.0.1'], f.remote);
    await f.npm(['run', 'postversion']);
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), versionHead);
    assert.equal(await f.git(['rev-parse', 'refs/tags/v1.0.1^{commit}'], f.remote), versionHead);
    assert.equal(JSON.parse(await readFile(join(f.checkout, 'package.json'), 'utf8')).version, '1.0.1');
});

test('dirty, detached, failed-check and custom-prefix preflight leave the version unchanged', async (t) => {
    for (const mode of ['untracked', 'tracked', 'detached', 'failed-check', 'prefix']) {
        const f = await fixture(t);
        const head = await f.git(['rev-parse', 'HEAD']);
        if (mode === 'untracked') await writeFile(join(f.checkout, 'untracked.txt'), 'preserve me\n');
        if (mode === 'tracked') await writeFile(join(f.checkout, 'fixture.txt'), 'modified\n');
        if (mode === 'detached') await f.git(['checkout', '--detach', '-q']);
        await assert.rejects(f.npm(['version', 'patch', ...(mode === 'prefix' ? ['--tag-version-prefix=release-'] : [])], mode === 'failed-check' ? { PTBK_FIXTURE_FAIL_CHECK: '1' } : {}));
        assert.equal(JSON.parse(await readFile(join(f.checkout, 'package.json'), 'utf8')).version, '1.0.0');
        assert.equal(await f.git(['rev-parse', 'HEAD']), head);
        assert.equal(await f.git(['tag', '--list']), '');
        assert.equal(await f.git(['tag', '--list'], f.remote), '');
    }
});

test('no-git-tag-version updates metadata without a version commit, tag or push', async (t) => {
    const f = await fixture(t);
    const head = await f.git(['rev-parse', 'HEAD']);
    await writeFile(join(f.checkout, 'untracked.txt'), 'uncommitted work\n');
    await f.git(['checkout', '--detach', '-q']);
    const bumped = await f.npm(['version', 'patch', '--no-git-tag-version']);
    assert.match(bumped.stdout, /did not push or trigger publication/);
    assert.equal(JSON.parse(await readFile(join(f.checkout, 'package.json'), 'utf8')).version, '1.0.1');
    assert.equal(await f.git(['rev-parse', 'HEAD']), head);
    assert.equal(await f.git(['tag', '--list']), '');
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), head);
});

test('postversion refuses a version tag which does not identify the current commit', async (t) => {
    const f = await fixture(t);
    await f.npm(['version', 'patch']);
    const published = await f.git(['rev-parse', 'HEAD']);
    await writeFile(join(f.checkout, 'fixture.txt'), 'later work\n');
    await f.git(['add', 'fixture.txt']);
    await f.git(['commit', '-qm', 'later work']);
    await assert.rejects(f.npm(['run', 'postversion']), error => {
        assert.match(error.stderr, /does not identify HEAD/);
        return true;
    });
    assert.equal(await f.git(['rev-parse', 'refs/heads/release'], f.remote), published);
});
