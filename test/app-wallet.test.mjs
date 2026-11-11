import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { ALL_PERMISSIONS } from '../dist/app/web/access.js';
import { WalletSubEngine } from '../dist/wallet/wallet.js';
import { temporaryDirectory } from './helpers.mjs';

/** A real encrypted Wallet behind the HTTP contract, without a network listener. */
async function fixture(t, ready = true) {
    const root = await temporaryDirectory(t, 'app wallet');
    const logs = [];
    const wallet = new WalletSubEngine({ project: { root, runtime: { root: join(root, '.ptbk') } }, env: { ...process.env, PTBK_HOME: join(root, 'home'), PTBK_HOST_UNLOCK: 'insecure-test-file' }, onChange: () => undefined, log: (text) => logs.push(text) });
    await wallet.initialize();
    if (ready) { await wallet.beginSetup(); await wallet.confirmSetup(); }
    const api = new EngineApi({ agenda: { wallet, snapshot: () => ({ project: { name: 'Wallet test' } }) }, projectRoot: root, stateDirectory: join(root, 'app'), engineId: () => null, hostname: () => 'engine.test', dashboardUrl: () => null, security: () => undefined, ui: () => ({}) });
    const actor = { memberId: 'owner', displayName: 'Owner', role: 'owner', permissions: [...ALL_PERMISSIONS], stepUpFresh: true };
    const call = async (path, method = 'GET', body, overrides = {}) => {
        const response = await api.handle(new Request(`https://engine.test/api/v1${path}`, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }), { ...actor, ...overrides }, {});
        return { status: response.status, body: response.status === 204 ? null : await response.json() };
    };
    return { wallet, logs, call };
}

/** Synthetic write-only credentials, never an account or real password. */
const login = { origin: 'https://service.test', username: 'owner@example.test', password: 'test-password-private-value', fields: [{ label: 'Customer number', value: 'test-field-private-value' }] };

test('App Wallet: encrypted add, upsert, update and remove obey the contract and never return secrets', async (t) => {
    const { call, logs } = await fixture(t);
    const engine = await call('/engine');
    assert.ok(engine.body.capabilities.some(c => c.id === 'wallet' && c.version === 1));
    const saved = await call('/wallet/records', 'POST', login);
    assert.equal(saved.status, 200, JSON.stringify(saved));
    const id = saved.body.record.id;
    assert.equal(saved.body.record.verification, null);
    assert.equal(saved.body.record.username, login.username, 'account metadata lets the client update the selected login');
    assert.deepEqual(saved.body.record.fields, [{ label: 'Customer number', uncertain: false }]);
    assert.equal((await call('/wallet/records', 'POST', login)).body.record.id, id);
    assert.equal((await call('/wallet')).body.records.length, 1);
    const updated = await call(`/wallet/records/${id}`, 'PUT', { ...login, label: 'Personal account', password: 'replacement-private-value', fields: [{ label: 'Customer number', value: '' }] });
    assert.equal(updated.status, 200, JSON.stringify(updated));
    assert.equal(updated.body.record.id, id);
    assert.equal(updated.body.record.label, 'Personal account');
    assert.deepEqual(updated.body.record.fields, []);
    for (const value of [saved, updated, await call('/wallet'), logs]) {
        for (const secret of [login.password, login.fields[0].value, 'replacement-private-value']) assert.ok(!JSON.stringify(value).includes(secret));
    }
    assert.equal((await call('/wallet/records/missing', 'PUT', login)).status, 404, 'a missing ID never becomes an upsert');
    assert.equal((await call(`/wallet/records/${id}`, 'DELETE')).status, 204);
    assert.equal((await call(`/wallet/records/${id}`, 'DELETE')).status, 404);
    assert.deepEqual((await call('/wallet')).body.records, []);
});

test('App Wallet: permissions, step-up, unknown fields and non-ready Wallet refuse writes without changing data', async (t) => {
    const { call } = await fixture(t);
    assert.equal((await call('/wallet', 'GET', undefined, { permissions: [] })).status, 403);
    assert.equal((await call('/wallet/records', 'POST', login, { permissions: ['wallet.read'] })).status, 403);
    assert.equal((await call('/wallet/records', 'POST', login, { stepUpFresh: false })).body.code, 'step-up-required');
    assert.equal((await call('/wallet/records', 'POST', { ...login, unexpected: true })).status, 400);
    assert.deepEqual((await call('/wallet')).body.records, []);
    const empty = await fixture(t, false);
    assert.equal((await empty.call('/wallet/records', 'POST', login)).body.code, 'wallet-not-ready');
});

test('App Wallet: request steps, seen idempotency, rejection and save settle the real waiting requests', async (t) => {
    const { wallet, call } = await fixture(t);
    const page = { inspect: async () => ({ origin: login.origin, form: 'password' }), signIn: async () => ({ result: 'signed-in' }) };
    await wallet.login(page, { task: 'Waiting task', agent: 'Developer' });
    const request = (await call('/wallet')).body.pending[0];
    assert.ok(request);
    assert.equal(request.seenAt, null);
    assert.equal((await call(`/wallet/requests/${request.id}/seen`, 'POST', { step: request.step + 1 })).body.code, 'wallet-request-moved');
    const seen = await call(`/wallet/requests/${request.id}/seen`, 'POST', { step: request.step });
    assert.equal(seen.status, 200);
    assert.ok(seen.body.seenAt);
    assert.equal((await call(`/wallet/requests/${request.id}/seen`, 'POST', { step: request.step })).body.seenAt, seen.body.seenAt);
    const saved = await call('/wallet/records', 'POST', { ...login, requestId: request.id });
    assert.deepEqual(saved.body.resolvedRequestIds, [request.id]);
    assert.deepEqual((await call('/wallet')).body.pending, []);
    assert.equal((await call(`/wallet/requests/${request.id}/reject`, 'POST', { step: request.step })).status, 404);
    await wallet.login({ ...page, inspect: async () => ({ origin: 'https://other.test', form: 'password' }) }, { task: 'Other task' });
    const other = (await call('/wallet')).body.pending[0];
    assert.equal((await call(`/wallet/requests/${other.id}/reject`, 'POST', { step: other.step + 1 })).body.code, 'wallet-request-moved');
    assert.equal((await call(`/wallet/requests/${other.id}/reject`, 'POST', { step: other.step })).status, 204);
    assert.equal(wallet.action(other.id).state, 'dismissed');
});
