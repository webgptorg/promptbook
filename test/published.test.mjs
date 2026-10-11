import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPublishedMetadata, waitForPublishedMetadata } from '../scripts/verify-published.mjs';

/** Registry fixtures describe exactly one intended release and its default channel. */
const release = { version: '1.2.3-0', tag: 'latest' };
/** A published artifact must have version, channel, tarball and SHA-512 integrity metadata. */
const metadata = {
    version: release.version,
    'dist-tags': { latest: release.version },
    'dist.tarball': `https://registry.npmjs.org/ptbk/-/ptbk-${release.version}.tgz`,
    'dist.integrity': `sha512-${'A'.repeat(86)}==`,
};

/** Controlled clock and registry responses prove bounded propagation without online waits. */
function polling(responses, timeoutMs = 100) {
    let elapsed = 0;
    let reads = 0;
    const delays = [];
    return {
        options: {
            readMetadata: async () => {
                const response = responses[Math.min(reads++, responses.length - 1)];
                if (response instanceof Error) throw response;
                return response;
            },
            now: () => elapsed,
            wait: async delay => { delays.push(delay); elapsed += delay; },
            log: () => {},
            timeoutMs,
            intervalMs: 30,
        },
        reads: () => reads,
        delays,
    };
}

test('published metadata must match the exact artifact and latest installation channel', () => {
    assert.doesNotThrow(() => assertPublishedMetadata(release, metadata));
    for (const change of [{ version: '0.0.0' }, { 'dist-tags': { latest: '0.0.0' } }, { 'dist.tarball': 'https://example.test/package.tgz' }, { 'dist.integrity': 'sha1-old' }]) {
        assert.throws(() => assertPublishedMetadata(release, { ...metadata, ...change }));
    }
});

test('temporary missing artifacts, network failures and stale tags are retried until publication propagates', async () => {
    const p = polling([
        Object.assign(new Error('not found'), { stderr: 'npm error code E404' }),
        Object.assign(new Error('temporary network failure'), { code: 'ECONNRESET' }),
        { ...metadata, 'dist-tags': { latest: '1.2.2' } },
        metadata,
    ]);
    assert.deepEqual(await waitForPublishedMetadata(release, p.options), metadata);
    assert.equal(p.reads(), 4);
    assert.deepEqual(p.delays, [30, 30, 30]);
});

test('propagation stops at its deadline and reports the last registry failure', async () => {
    const p = polling([Object.assign(new Error('missing version'), { code: 'E404' })]);
    await assert.rejects(waitForPublishedMetadata(release, p.options), /within 0.1 seconds.*Last result: E404/);
    assert.equal(p.reads(), 4);
    assert.deepEqual(p.delays, [30, 30, 30, 10]);
});

test('authentication errors and invalid artifacts stop immediately without propagation retries', async () => {
    for (const response of [Object.assign(new Error('unauthorized'), { code: 'E401' }), { ...metadata, version: '0.0.0' }, { ...metadata, 'dist.integrity': '' }]) {
        const p = polling([response]);
        await assert.rejects(waitForPublishedMetadata(release, p.options));
        assert.equal(p.reads(), 1);
        assert.deepEqual(p.delays, []);
    }
});
