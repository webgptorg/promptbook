import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { validateRelease } from '../scripts/validate-release.mjs';
import { assertPublishContext } from '../scripts/assert-publish-context.mjs';

/** Load the actual public manifest so changes to the package contract are covered. */
const original = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

/** Create independent release metadata without copying repository content or secrets. */
async function metadataFixture(t, modify = () => {}) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-release-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const manifest = structuredClone(original);
    const lock = { name: manifest.name, version: manifest.version, lockfileVersion: 3, packages: { '': { name: manifest.name, version: manifest.version, bin: manifest.bin } } };
    modify(manifest, lock);
    await mkdir(join(directory, 'bin'));
    await writeFile(join(directory, 'bin', 'ptbk.js'), '#!/usr/bin/env node\n');
    await writeFile(join(directory, 'package.json'), JSON.stringify(manifest));
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    return pathToFileURL(directory + sep);
}

test('stable and numeric prereleases use the single ptbk default installation channel', async (t) => {
    for (const version of ['1.2.3', '1.2.3-0', '1.2.3-beta.1']) {
        const root = await metadataFixture(t, (manifest, lock) => {
            manifest.version = lock.version = lock.packages[''].version = version;
        });
        assert.deepEqual(await validateRelease(`v${version}`, root), { version, tag: 'latest' });
    }
});

test('release validation rejects wrong tags, semver, package identity, workspaces and lockfiles', async (t) => {
    const root = await metadataFixture(t);
    await assert.rejects(validateRelease('v0.0.0', root), /must match/);
    for (const [modify, error] of [
        [(manifest) => { manifest.name = '@promptbook/legacy'; }, /Only the public ptbk/],
        [(manifest) => { manifest.private = true; }, /Only the public ptbk/],
        [(manifest) => { manifest.workspaces = ['packages/*']; }, /workspaces/],
        [(manifest) => { manifest.version = '1.2.3-01'; }, /valid release semver/],
        [(manifest) => { manifest.version = '1.2.3+metadata'; }, /valid release semver/],
        [(_, lock) => { delete lock.packages; }, /name\/version\/bin differ/],
        [(_, lock) => { lock.version = '0.0.0'; }, /name\/version\/bin differ/],
        [(manifest) => { manifest.bin = { legacy: 'bin/ptbk.js' }; }, /exactly the ptbk executable/],
        [(manifest) => { manifest.publishConfig.registry = 'https://example.test/'; }, /npm registry/],
    ]) {
        await assert.rejects(validateRelease('', await metadataFixture(t, modify)), error);
    }
    await writeFile(new URL('bin/ptbk.js', root), 'console.log("missing shebang");\n');
    await assert.rejects(validateRelease('', root), /shebang/);
});

test('publication requires the official GitHub Actions repository and a release tag', () => {
    const allowed = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'webgptorg/promptbook', RELEASE_TAG: `v${original.version}` };
    assert.doesNotThrow(() => assertPublishContext(allowed));
    for (const env of [{}, { ...allowed, GITHUB_ACTIONS: 'false' }, { ...allowed, GITHUB_REPOSITORY: 'fork/promptbook' }, { ...allowed, RELEASE_TAG: '' }]) {
        assert.throws(() => assertPublishContext(env), /Publish ptbk through GitHub Actions/);
    }
});
