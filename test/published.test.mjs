import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForPublishedMetadata } from '../scripts/verify-published.mjs';

/** The exact prerelease and distribution channel used by registry fixtures. */
const release = { version: '0.115.0-3', tag: 'next' };
/** A complete public registry response matching the intended artifact. */
const published = {
    version: release.version,
    'dist-tags': { next: release.version, latest: '0.114.0-50' },
    'dist.tarball': `https://registry.npmjs.org/ptbk/-/ptbk-${release.version}.tgz`,
    'dist.integrity': `sha512-${Buffer.alloc(64).toString('base64')}`,
};

/** Reproduces npm's promisified child-process failure with its registry code in stderr. */
function npmError(code) {
    return Object.assign(new Error('npm view failed'), { code: 1, stderr: `npm error code ${code}\n` });
}

/** Supplies deterministic registry reads and a clock advanced only by simulated waits. */
function pollingFixture(results, overrides = {}) {
    let elapsed = 0;
    let reads = 0;
    const waits = [];
    const messages = [];
    const options = {
        readMetadata: async () => {
            const result = results[Math.min(reads++, results.length - 1)];
            if (result instanceof Error) throw result;
            return result;
        },
        wait: async milliseconds => { waits.push(milliseconds); elapsed += milliseconds; },
        now: () => elapsed,
        log: message => messages.push(message),
        timeoutMs: 25,
        intervalMs: 10,
        ...overrides,
    };
    return { options, waits, messages, reads: () => reads };
}

test('an already public release is verified on the first fresh read', async () => {
    const fixture = pollingFixture([published]);
    assert.equal(await waitForPublishedMetadata(release, fixture.options), published);
    assert.equal(fixture.reads(), 1);
    assert.deepEqual(fixture.waits, []);
});

test('npm processing E404 and a temporary network failure are retried until publication is public', async () => {
    const fixture = pollingFixture([npmError('E404'), npmError('ECONNRESET'), published]);
    assert.equal(await waitForPublishedMetadata(release, fixture.options), published);
    assert.equal(fixture.reads(), 3);
    assert.deepEqual(fixture.waits, [10, 10]);
    assert.match(fixture.messages[0], /E404/);
    assert.match(fixture.messages[1], /ECONNRESET/);
});

test('stale or missing release dist-tags are retried without accepting the wrong channel', async () => {
    const fixture = pollingFixture([
        { ...published, 'dist-tags': { next: '0.115.0-2' } },
        { ...published, 'dist-tags': { latest: release.version } },
        published,
    ]);
    assert.equal(await waitForPublishedMetadata(release, fixture.options), published);
    assert.equal(fixture.reads(), 3);
    assert.deepEqual(fixture.waits, [10, 10]);
    assert.match(fixture.messages[0], /next dist-tag/);
});

test('registry propagation stops at its bounded deadline with the exact release and last failure', async () => {
    const missing = npmError('E404');
    const fixture = pollingFixture([missing]);
    await assert.rejects(waitForPublishedMetadata(release, fixture.options), error => {
        assert.match(error.message, /ptbk@0\.115\.0-3.*next.*0\.025 seconds.*3 registry reads.*E404/);
        assert.equal(error.cause, missing);
        return true;
    });
    assert.equal(fixture.reads(), 3);
    assert.deepEqual(fixture.waits, [10, 10, 5]);
});

test('a permanently stale dist-tag also fails at the deadline', async () => {
    const fixture = pollingFixture([{ ...published, 'dist-tags': { next: '0.115.0-2' } }]);
    await assert.rejects(waitForPublishedMetadata(release, fixture.options), /next dist-tag does not point to 0\.115\.0-3/);
    assert.equal(fixture.reads(), 3);
});

test('authentication and authorization failures fail immediately instead of hiding credential issues', async () => {
    for (const code of ['E401', 'E403']) {
        const failure = npmError(code);
        failure.killed = true;
        const fixture = pollingFixture([failure, published]);
        await assert.rejects(waitForPublishedMetadata(release, fixture.options), error => error === failure);
        assert.equal(fixture.reads(), 1);
        assert.deepEqual(fixture.waits, []);
    }
});

test('an existing wrong or incomplete artifact fails immediately even with a stale dist-tag', async () => {
    for (const metadata of [
        undefined,
        null,
        [],
        { ...published, version: '0.115.0-2', 'dist-tags': {} },
        { ...published, 'dist.tarball': undefined, 'dist-tags': {} },
        { ...published, 'dist.integrity': undefined, 'dist-tags': {} },
    ]) {
        const fixture = pollingFixture([metadata, published]);
        await assert.rejects(waitForPublishedMetadata(release, fixture.options), assert.AssertionError);
        assert.equal(fixture.reads(), 1);
        assert.deepEqual(fixture.waits, []);
    }
});

test('temporary registry server failures and structured npm errors can propagate successfully', async () => {
    const structured = Object.assign(new Error('npm view failed'), { code: 1, stdout: '{"error":{"code":"ETARGET"}}' });
    const fixture = pollingFixture([npmError('E503'), structured, published]);
    assert.equal(await waitForPublishedMetadata(release, fixture.options), published);
    assert.deepEqual(fixture.waits, [10, 10]);
});

test('malformed registry JSON and unexpected errors fail immediately', async () => {
    for (const failure of [new SyntaxError('Unexpected token'), npmError('EUNKNOWN')]) {
        const fixture = pollingFixture([failure, published]);
        await assert.rejects(waitForPublishedMetadata(release, fixture.options), error => error === failure);
        assert.equal(fixture.reads(), 1);
        assert.deepEqual(fixture.waits, []);
    }
});
