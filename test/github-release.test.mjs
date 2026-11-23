import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureGithubRelease } from '../scripts/ensure-github-release.mjs';

/** Matches the actual GitHub CLI child-process error shape, whose numeric code is not an HTTP status. */
function githubError(message) {
    return Object.assign(new Error(message), { code: 1, stderr: `${message}\n` });
}

/** Drives release creation with independent observed state and records every read, write and backoff. */
function releaseFixture({ tag = 'v1.2.3-4', initialRelease, create = async () => {}, read, backoff } = {}) {
    const calls = [];
    let release = initialRelease;
    let creations = 0;
    let reads = 0;
    return {
        calls,
        run: () => ensureGithubRelease(tag, 'Release notes\nwith a second line.', {
            gh: async (arguments_) => {
                calls.push(arguments_);
                if (arguments_[1] === 'view') {
                    reads++;
                    if (read) await read(reads);
                    if (!release) throw githubError('release not found');
                    return JSON.stringify(release);
                }
                creations++;
                await create(creations, (value = { tagName: tag, assets: [] }) => { release = value; });
                release ??= { tagName: tag, assets: [] };
                return '';
            },
            sleep: async (milliseconds) => {
                calls.push(['sleep', milliseconds]);
                if (backoff) await backoff((value) => { release = value; });
            },
            log: () => {},
        }),
    };
}

test('release creation recovers from the observed HTTP 500 only after reconciling the missing release', async () => {
    const fixture = releaseFixture({ create: async (attempt) => { if (attempt === 1) throw githubError('HTTP 500 (https://api.github.com/repos/webgptorg/promptbook/releases)'); } });
    assert.deepEqual(await fixture.run(), { tagName: 'v1.2.3-4', assets: [] });
    assert.deepEqual(fixture.calls.map((call) => call[1]), ['view', 'create', 'view', 5000, 'view', 'create', 'view']);
    const creations = fixture.calls.filter((call) => call[1] === 'create');
    assert.deepEqual(creations[0], ['release', 'create', 'v1.2.3-4', '--verify-tag', '--title', 'ptbk 1.2.3-4', '--notes', 'Release notes\nwith a second line.', '--prerelease']);
    assert.deepEqual(creations[1], creations[0], 'retries preserve the immutable tag and release labelling');
});

test('an existing release and its assets are reused without creation', async () => {
    const initialRelease = { tagName: 'v1.2.3', assets: [{ name: 'already-published.exe' }] };
    const fixture = releaseFixture({ tag: 'v1.2.3', initialRelease });
    assert.deepEqual(await fixture.run(), initialRelease);
    assert.equal(fixture.calls.length, 1);
});

test('a lost creation response or concurrent publisher is reconciled without repeating creation and retains its assets', async () => {
    for (const message of ['HTTP 502', 'HTTP 422: already_exists', 'connection reset by peer']) {
        const initialRelease = { tagName: 'v1.2.3-4', assets: [{ name: 'concurrent-asset.exe' }] };
        const fixture = releaseFixture({ create: async (_attempt, publish) => { publish(initialRelease); throw githubError(message); } });
        assert.deepEqual(await fixture.run(), initialRelease);
        assert.deepEqual(fixture.calls.map((call) => call[1]), ['view', 'create', 'view']);
    }
});

test('persistent server failures stop after three reconciled creation attempts and preserve the last error', async () => {
    const failure = githubError('HTTP 503: service unavailable');
    const fixture = releaseFixture({ create: async () => { throw failure; } });
    await assert.rejects(fixture.run(), (error) => error === failure);
    assert.equal(fixture.calls.filter((call) => call[1] === 'create').length, 3);
    assert.deepEqual(fixture.calls.filter((call) => call[0] === 'sleep'), [['sleep', 5000], ['sleep', 10000]]);
    assert.equal(fixture.calls.at(-1)[1], 'view', 'even the final failed attempt is reconciled');
});

test('a release created by another publisher during backoff prevents another creation attempt', async () => {
    const concurrentRelease = { tagName: 'v1.2.3-4', assets: [{ name: 'extension.vsix' }] };
    const fixture = releaseFixture({
        create: async () => { throw githubError('HTTP 504'); },
        backoff: async (publish) => { publish(concurrentRelease); },
    });
    assert.deepEqual(await fixture.run(), concurrentRelease);
    assert.deepEqual(fixture.calls.map((call) => call[1]), ['view', 'create', 'view', 5000, 'view']);
});

test('authentication, permissions, validation and unknown creation errors are never retried', async () => {
    for (const message of ['HTTP 401', 'HTTP 403', 'HTTP 404', 'HTTP 422', 'unknown failure']) {
        const failure = githubError(message);
        const fixture = releaseFixture({ create: async () => { throw failure; } });
        await assert.rejects(fixture.run(), (error) => error === failure);
        assert.deepEqual(fixture.calls.map((call) => call[1]), ['view', 'create', 'view']);
    }
});

test('a failed lookup before creation, during reconciliation or before a retry stops all further mutations', async () => {
    for (const failingRead of [1, 2, 3]) {
        const failure = githubError('HTTP 503: lookup unavailable');
        const fixture = releaseFixture({
            read: async (attempt) => { if (attempt === failingRead) throw failure; },
            create: async () => { throw githubError('HTTP 500'); },
        });
        await assert.rejects(fixture.run(), (error) => error === failure);
        assert.equal(fixture.calls.filter((call) => call[1] === 'create').length, failingRead === 1 ? 0 : 1);
    }
});

test('successful creation of a stable release omits prerelease labelling and reads back the release', async () => {
    const fixture = releaseFixture({ tag: 'v1.2.3' });
    assert.deepEqual(await fixture.run(), { tagName: 'v1.2.3', assets: [] });
    assert.deepEqual(fixture.calls.map((call) => call[1]), ['view', 'create', 'view']);
    assert.ok(!fixture.calls[1].includes('--prerelease'));
});

test('invalid release metadata is never treated as a missing release', async () => {
    for (const initialRelease of [{ tagName: 'v9.9.9', assets: [] }, { tagName: 'v1.2.3-4' }]) {
        const fixture = releaseFixture({ initialRelease });
        await assert.rejects(fixture.run(), /invalid release metadata/);
        assert.equal(fixture.calls.length, 1);
    }
});

test('an accepted creation without readable release metadata stops without creating again', async () => {
    const calls = [];
    await assert.rejects(ensureGithubRelease('v1.2.3', 'Release notes', {
        gh: async (arguments_) => {
            calls.push(arguments_[1]);
            if (arguments_[1] === 'view') throw githubError('release not found');
            return '';
        },
    }), /accepted creation.*could not be read/);
    assert.deepEqual(calls, ['view', 'create', 'view']);
});
