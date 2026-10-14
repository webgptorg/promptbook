import assert from 'node:assert/strict';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import { captureServiceEnvironment, restoreServiceEnvironment } from '../dist/coder/service-environment.js';

test('daemon discovery restores custom PATH and native store references without serializing credentials', () => {
    const bin = join(dirname(process.execPath), 'custom provider bin');
    const nativeHome = join(bin, 'native account');
    const saved = captureServiceEnvironment({ Path: bin, CODEX_HOME: nativeHome, OPENAI_API_KEY: 'fixture-secret', PTBK_OPENAI_CODEX_USE_API_KEY: '1', UNRELATED_VALUE: 'not a path' });
    assert.deepEqual(saved, { PATH: bin, CODEX_HOME: nativeHome });
    assert.equal(JSON.stringify(saved).includes('fixture-secret'), false);
    const env = { Path: join(bin, 'os manager bin') };
    restoreServiceEnvironment(JSON.parse(JSON.stringify(saved)), env);
    assert.equal(env.Path.split(delimiter)[0], bin);
    assert.equal(env.PATH, undefined, 'Copied Windows environments retain one case-insensitive Path key');
    assert.equal(env.CODEX_HOME, nativeHome);
    assert.equal(env.OPENAI_API_KEY, undefined);
});

test('legacy daemon metadata keeps the pinned Node global bin available before OS-manager PATH', () => {
    const node = join(dirname(process.execPath), 'legacy node bin', 'node');
    const env = { PATH: join(dirname(process.execPath), 'os manager bin') };
    restoreServiceEnvironment(undefined, env, node);
    assert.equal(env.PATH.split(delimiter)[0], dirname(node));
    assert.equal(new Set(env.PATH.split(delimiter)).size, env.PATH.split(delimiter).length);
});

test('invalid or secret-bearing discovery metadata fails before mutating the worker environment', () => {
    for (const saved of [null, [], 'PATH', { PATH: 123 }, { PATH: 'invalid\0path' }, { PATH: 'custom', OPENAI_API_KEY: 'fixture-secret' }]) {
        const env = { PATH: 'original' };
        assert.throws(() => restoreServiceEnvironment(saved, env), /Invalid daemon discovery environment/);
        assert.deepEqual(env, { PATH: 'original' });
    }
});
