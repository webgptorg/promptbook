import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Only disposable repositories and local file remotes are used by these lifecycle tests. */
const execute = promisify(execFile);
/** The real hooks are copied so their installation-relative manifest lookup stays realistic. */
const repository = path.resolve('.');

/** Normalize npm's version settings without inheriting a developer's tag/signing preferences. */
function environment(overrides = {}) {
    const env = { ...process.env, npm_config_git_tag_version: 'true', npm_config_sign_git_tag: 'false', npm_config_tag_version_prefix: 'v', npm_config_message: '%s', npm_config_ignore_scripts: 'false', npm_config_audit: 'false', npm_config_fund: 'false', ...overrides };
    delete env.RELEASE_TAG;
    return env;
}

/** Invoke a fixture command with bounded output and return the actual failure code. */
async function command(cwd, executable, arguments_, env = environment()) {
    try { return { code: 0, ...await execute(executable, arguments_, { cwd, env, timeout: 30000, maxBuffer: 1024 * 1024 }) }; }
    catch (error) { return { code: error.code ?? 1, stdout: error.stdout || '', stderr: error.stderr || '' }; }
}

/** Git helpers fail immediately; an unexpected fixture setup failure cannot look like a hook refusal. */
async function git(cwd, ...arguments_) {
    const result = await command(cwd, 'git', arguments_);
    assert.equal(result.code, 0, result.stderr);
    return result.stdout.trim();
}

/** Build a dependency-free ptbk project with the actual preversion/postversion scripts. */
async function fixture(t, options = {}) {
    const temporary = await mkdtemp(path.join(tmpdir(), 'ptbk version '));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const root = path.join(temporary, 'project'); const remote = path.join(temporary, 'remote.git');
    await mkdir(root); await mkdir(remote); await mkdir(path.join(root, 'scripts'));
    const manifest = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
    await copyFile(path.join(repository, 'scripts/preversion.mjs'), path.join(root, 'scripts/preversion.mjs'));
    await copyFile(path.join(repository, 'scripts/postversion.mjs'), path.join(root, 'scripts/postversion.mjs'));
    await copyFile(path.join(repository, 'scripts/validate-release.mjs'), path.join(root, 'scripts/validate-release.mjs'));
    await writeFile(path.join(root, 'scripts/typecheck.mjs'), "process.stdout.write('Fixture typecheck passed\\n');\n");
    const pkg = { name: 'ptbk', version: '1.2.3', private: false, scripts: {
        typecheck: 'node scripts/typecheck.mjs', build: 'node scripts/typecheck.mjs', 'release:validate': 'node scripts/validate-release.mjs',
        preversion: manifest.scripts.preversion, postversion: manifest.scripts.postversion,
    } };
    await writeFile(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
    await writeFile(path.join(root, 'package-lock.json'), `${JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: { '': { name: pkg.name, version: pkg.version } } }, null, 2)}\n`);
    await git(root, 'init', '--quiet'); await git(root, 'config', 'user.name', 'Version fixture'); await git(root, 'config', 'user.email', 'version@example.test');
    await git(root, 'config', 'commit.gpgsign', 'false'); await git(root, 'config', 'tag.gpgsign', 'false');
    await git(root, 'add', '--', 'package.json', 'package-lock.json', 'scripts'); await git(root, 'commit', '-qm', 'Fixture baseline');
    const branch = await git(root, 'symbolic-ref', '--short', 'HEAD');
    await git(remote, 'init', '--bare', '--quiet');
    const remoteName = options.remoteName || 'origin';
    await git(root, 'remote', 'add', remoteName, remote);
    await git(root, 'push', '-u', remoteName, `HEAD:refs/heads/${branch}`);
    return { root, remote, branch, remoteName, baseline: await git(root, 'rev-parse', 'HEAD'), version: '1.3.0-0', tag: 'v1.3.0-0' };
}

/** Read both version files exactly to detect writes made before a failed preversion check. */
async function versionFiles(root) {
    return Promise.all(['package.json', 'package-lock.json'].map(filename => readFile(path.join(root, filename), 'utf8')));
}

test('the package uses npm version lifecycle checks and ordinary Git-tagged release aliases', async () => {
    const pkg = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts.preversion, 'node scripts/preversion.mjs && npm run typecheck && npm run release:validate && npm run build');
    assert.match(pkg.scripts.postversion, /node scripts\/postversion\.mjs/);
    assert.equal(pkg.scripts['release:preminor'], 'npm version preminor');
    assert.equal(pkg.scripts['release:prerelease'], 'npm version prerelease');
});

test('actual npm version commits and atomically pushes only its branch and exact new tag', async t => {
    const f = await fixture(t);
    await git(f.root, 'config', 'push.followTags', 'true');
    await git(f.root, 'tag', '-a', 'unrelated-local-tag', '-m', 'Never publish this unrelated tag');
    const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Fixture typecheck passed/);
    const head = await git(f.root, 'rev-parse', 'HEAD');
    assert.equal(await git(f.root, 'rev-parse', 'HEAD^'), f.baseline);
    assert.equal(await git(f.root, 'rev-parse', `${f.tag}^{}`), head);
    assert.equal(await git(f.remote, 'rev-parse', `refs/heads/${f.branch}`), head);
    assert.equal(await git(f.remote, 'rev-parse', `refs/tags/${f.tag}^{}`), head);
    assert.deepEqual((await git(f.root, 'show', '--format=', '--name-only', 'HEAD')).split('\n').sort(), ['package-lock.json', 'package.json']);
    assert.deepEqual((await git(f.remote, 'tag', '--list')).split('\n'), [f.tag]);
    assert.equal(await git(f.root, 'status', '--porcelain'), '');
    const [manifest, lock] = (await versionFiles(f.root)).map(JSON.parse);
    assert.equal(manifest.version, f.version); assert.equal(lock.version, f.version); assert.equal(lock.packages[''].version, f.version);
});

test('postversion uses the tracked remote and target branch rather than an unrelated origin', async t => {
    const f = await fixture(t, { remoteName: 'release-upstream' });
    const origin = path.join(path.dirname(f.root), 'unrelated-origin.git'); await mkdir(origin); await git(origin, 'init', '--bare', '--quiet');
    await git(f.root, 'remote', 'add', 'origin', origin);
    await git(f.root, 'push', 'release-upstream', `HEAD:refs/heads/release-target`);
    await git(f.root, 'config', `branch.${f.branch}.merge`, 'refs/heads/release-target');
    const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.equal(result.code, 0, result.stderr); const head = await git(f.root, 'rev-parse', 'HEAD');
    assert.equal(await git(f.remote, 'rev-parse', 'refs/heads/release-target'), head);
    assert.equal(await git(f.remote, 'rev-parse', `refs/heads/${f.branch}`), f.baseline);
    assert.equal(await git(origin, 'for-each-ref', '--format=%(refname)'), '');
});

test('postversion falls back to origin and the current branch when no upstream is configured', async t => {
    const f = await fixture(t); await git(f.root, 'config', '--remove-section', `branch.${f.branch}`);
    const result = await command(f.root, 'npm', ['version', 'preminor']); assert.equal(result.code, 0, result.stderr);
    const head = await git(f.root, 'rev-parse', 'HEAD');
    assert.equal(await git(f.remote, 'rev-parse', `refs/heads/${f.branch}`), head);
    assert.equal(await git(f.remote, 'rev-parse', `refs/tags/${f.tag}^{}`), head);
});

test('postversion refuses a local-dot upstream rather than treating it as a publication remote', async t => {
    const f = await fixture(t); await git(f.root, 'config', `branch.${f.branch}.remote`, '.');
    assert.equal((await command(f.root, 'npm', ['version', 'preminor', '--ignore-scripts'])).code, 0);
    const before = await git(f.remote, 'show-ref'); const local = await git(f.root, 'show-ref');
    const result = await command(f.root, 'npm', ['run', 'postversion']); assert.notEqual(result.code, 0);
    assert.match(result.stderr, /remote/i); assert.equal(await git(f.remote, 'show-ref'), before); assert.equal(await git(f.root, 'show-ref'), local);
});

test('preversion typecheck failure preserves version bytes, HEAD, tags and remote refs', async t => {
    const f = await fixture(t);
    await writeFile(path.join(f.root, 'scripts/typecheck.mjs'), 'process.exit(9);\n');
    await git(f.root, 'add', '--', 'scripts/typecheck.mjs'); await git(f.root, 'commit', '-qm', 'Failing fixture typecheck');
    const before = await versionFiles(f.root); const head = await git(f.root, 'rev-parse', 'HEAD'); const remote = await git(f.remote, 'show-ref');
    const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.deepEqual(await versionFiles(f.root), before); assert.equal(await git(f.root, 'rev-parse', 'HEAD'), head);
    assert.equal(await git(f.root, 'tag', '--list'), ''); assert.equal(await git(f.remote, 'show-ref'), remote);
});

test('preversion release validation failure preserves mismatched metadata without bumping or tagging', async t => {
    const f = await fixture(t); const lockPath = path.join(f.root, 'package-lock.json');
    const lock = JSON.parse(await readFile(lockPath, 'utf8')); lock.version = '1.2.2';
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`); await git(f.root, 'add', '--', 'package-lock.json'); await git(f.root, 'commit', '-qm', 'Mismatched fixture lock');
    const before = await versionFiles(f.root); const head = await git(f.root, 'rev-parse', 'HEAD');
    const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /name\/version differ/);
    assert.deepEqual(await versionFiles(f.root), before); assert.equal(await git(f.root, 'rev-parse', 'HEAD'), head);
    assert.equal(await git(f.root, 'tag', '--list'), ''); assert.equal(await git(f.remote, 'rev-parse', `refs/heads/${f.branch}`), f.baseline);
});

test('preversion refuses detached HEAD before changing the version or creating a tag', async t => {
    const f = await fixture(t); await git(f.root, 'checkout', '--quiet', '--detach');
    const before = await git(f.remote, 'show-ref'); const files = await versionFiles(f.root); const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /detached|named (?:Git )?branch/i);
    assert.equal(await git(f.remote, 'show-ref'), before); assert.deepEqual(await versionFiles(f.root), files);
    assert.equal(await git(f.root, 'tag', '--list'), ''); assert.equal(await git(f.root, 'rev-parse', 'HEAD'), f.baseline);
});

test('preversion refuses untracked files before changing the version or creating a tag', async t => {
    const f = await fixture(t); await writeFile(path.join(f.root, 'untracked-work.txt'), 'Unrelated user work\n');
    const before = await git(f.remote, 'show-ref'); const files = await versionFiles(f.root); const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /untracked|pending|clean/i);
    assert.equal(await git(f.remote, 'show-ref'), before); assert.deepEqual(await versionFiles(f.root), files);
    assert.equal(await git(f.root, 'tag', '--list'), ''); assert.equal(await git(f.root, 'rev-parse', 'HEAD'), f.baseline);
});

test('postversion refuses detached HEAD without publishing the retained local version', async t => {
    const f = await fixture(t); assert.equal((await command(f.root, 'npm', ['version', 'preminor', '--ignore-scripts'])).code, 0);
    await git(f.root, 'checkout', '--quiet', '--detach');
    const before = await git(f.remote, 'show-ref'); const result = await command(f.root, 'npm', ['run', 'postversion']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /detached|named branch/i);
    assert.equal(await git(f.remote, 'show-ref'), before);
    assert.equal(await git(f.root, 'rev-parse', `${f.tag}^{}`), await git(f.root, 'rev-parse', 'HEAD'));
});

test('postversion refuses a version tag pointing away from HEAD and keeps all local refs', async t => {
    const f = await fixture(t);
    assert.equal((await command(f.root, 'npm', ['version', 'preminor', '--ignore-scripts'])).code, 0);
    await git(f.root, 'tag', '-f', '-a', f.tag, '-m', 'Deliberately mismatched fixture tag', f.baseline);
    const before = await git(f.remote, 'show-ref'); const head = await git(f.root, 'rev-parse', 'HEAD');
    const result = await command(f.root, 'npm', ['run', 'postversion']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /tag|HEAD|commit/i);
    assert.equal(await git(f.remote, 'show-ref'), before); assert.equal(await git(f.root, 'rev-parse', 'HEAD'), head);
    assert.equal(await git(f.root, 'rev-parse', `${f.tag}^{}`), f.baseline);
});

test('postversion refuses dirty tracked metadata instead of pushing an unreviewed version', async t => {
    const f = await fixture(t);
    assert.equal((await command(f.root, 'npm', ['version', 'preminor', '--ignore-scripts'])).code, 0);
    const filename = path.join(f.root, 'package.json'); await writeFile(filename, `${await readFile(filename, 'utf8')}\n`);
    const before = await git(f.remote, 'show-ref'); const result = await command(f.root, 'npm', ['run', 'postversion']);
    assert.notEqual(result.code, 0); assert.match(result.stderr, /dirty|clean|uncommitted|tracked/i);
    assert.equal(await git(f.remote, 'show-ref'), before); assert.match(await git(f.root, 'status', '--porcelain'), /package\.json/);
});

test('explicit no-git-tag-version opt-out bumps locally without a commit, tag or push', async t => {
    const f = await fixture(t); const before = await git(f.remote, 'show-ref');
    const result = await command(f.root, 'npm', ['version', 'preminor', '--no-git-tag-version']);
    assert.equal(result.code, 0, result.stderr); assert.match(result.stdout + result.stderr, /skip|disabled|git-tag-version/i);
    assert.equal(JSON.parse(await readFile(path.join(f.root, 'package.json'), 'utf8')).version, f.version);
    assert.equal(await git(f.root, 'rev-parse', 'HEAD'), f.baseline); assert.equal(await git(f.root, 'tag', '--list'), '');
    assert.equal(await git(f.remote, 'show-ref'), before);
});

test('atomic push rejection retains the local version for retry and changes neither remote branch nor tag', async t => {
    const f = await fixture(t); const hook = path.join(f.remote, 'hooks/update');
    await writeFile(hook, '#!/bin/sh\ncase "$1" in refs/tags/v*) echo "Fixture rejects release tag" >&2; exit 1;; esac\nexit 0\n'); await chmod(hook, 0o755);
    const before = await git(f.remote, 'show-ref'); const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.match(result.stdout + result.stderr, /retry|postversion|retained|recover/i);
    const head = await git(f.root, 'rev-parse', 'HEAD'); assert.notEqual(head, f.baseline);
    assert.equal(await git(f.root, 'rev-parse', `${f.tag}^{}`), head); assert.equal(await git(f.remote, 'show-ref'), before);
    assert.equal(await git(f.root, 'status', '--porcelain'), '');
    await rm(hook);
    const retried = await command(f.root, 'npm', ['run', 'postversion']); assert.equal(retried.code, 0, retried.stderr);
    assert.equal(await git(f.root, 'rev-parse', 'HEAD'), head); assert.equal(await git(f.remote, 'rev-parse', `refs/heads/${f.branch}`), head);
    assert.equal(await git(f.remote, 'rev-parse', `refs/tags/${f.tag}^{}`), head);
    assert.deepEqual((await git(f.remote, 'tag', '--list')).split('\n'), [f.tag]);
});

test('postversion never force-pushes over a concurrently advanced remote branch', async t => {
    const f = await fixture(t); const peer = path.join(path.dirname(f.root), 'peer');
    await git(f.root, 'clone', '--quiet', '--branch', f.branch, f.remote, peer);
    await git(peer, 'config', 'user.name', 'Concurrent release fixture'); await git(peer, 'config', 'user.email', 'peer@example.test');
    await git(peer, 'config', 'commit.gpgsign', 'false'); await git(peer, 'commit', '--allow-empty', '-qm', 'Concurrent remote work');
    await git(peer, 'push', 'origin', `HEAD:refs/heads/${f.branch}`);
    const before = await git(f.remote, 'show-ref'); const result = await command(f.root, 'npm', ['version', 'preminor']);
    assert.notEqual(result.code, 0); assert.match(result.stdout + result.stderr, /rejected|non.fast.forward|fetch first/i);
    assert.equal(await git(f.remote, 'show-ref'), before); assert.equal(await git(f.remote, 'tag', '--list'), '');
    const head = await git(f.root, 'rev-parse', 'HEAD'); assert.equal(await git(f.root, 'rev-parse', `${f.tag}^{}`), head);
    assert.equal(await git(f.root, 'rev-parse', 'HEAD^'), f.baseline); assert.equal(await git(f.root, 'status', '--porcelain'), '');
});
