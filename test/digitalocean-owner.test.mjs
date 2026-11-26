import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DigitalOceanOwner } from '../dist/app/web/digitalocean-owner.js';
import { Gateway } from '../dist/app/web/gateway.js';
import { deriveEngineFingerprint } from '../dist/app/identity.js';
import { createPasskey } from './fixtures/webauthn.mjs';
import { AccessStore } from '../dist/app/web/access.js';
import { temporaryDirectory } from './helpers.mjs';

const host = 'project.ptbk.test';
const origin = 'https://' + host;
const startUrl = origin + '/setup/digitalocean';

async function fixture(t, wrong = '') {
    const access = await AccessStore.open(await temporaryDirectory(t, 'digitalocean owner'));
    const uuid = randomUUID(), team = randomUUID();
    const hash = v => createHash('sha256').update(v);
    const marker = hash(uuid + '/' + team).digest('hex');
    let challenge, revoked = 0;
    const oauth = new DigitalOceanOwner(async (url, init) => {
        assert.equal(init.redirect, 'error');
        if (url.endsWith('/register')) {
            assert.deepEqual(JSON.parse(init.body).redirect_uris, [startUrl + '/callback']);
            return Response.json({ client_id: 'test-public-client' });
        }
        if (url.endsWith('/token')) {
            assert.equal(hash(init.body.get('code_verifier')).digest('base64url'), challenge);
            return Response.json({ access_token: randomUUID(), info: { uuid: wrong === 'user' ? randomUUID() : uuid, team_uuid: wrong === 'team' ? randomUUID() : team } });
        }
        if (url.endsWith('/metadata/v1/id')) return new Response('123');
        if (url.endsWith('/droplets/123')) return Response.json({ droplet: { id: wrong === 'droplet' ? 456 : 123 } });
        assert.ok(url.endsWith('/revoke')); revoked++; return Response.json({});
    });
    const issue = async () => (await access.createSetupSecret(true)).secret;
    const initial = await oauth.handle(new Request(startUrl), host, marker, issue);
    const authorize = new URL(initial.headers.get('location'));
    assert.equal(authorize.origin, 'https://cloud.digitalocean.com');
    assert.deepEqual(authorize.searchParams.get('scope').split(' ').sort(),
        ['actions:read', 'droplet:read', 'image:read', 'regions:read', 'sizes:read', 'snapshot:read']);
    challenge = authorize.searchParams.get('code_challenge');
    const cookie = initial.headers.get('set-cookie').split(';')[0];
    const callback = new URL(startUrl + '/callback');
    callback.searchParams.set('state', authorize.searchParams.get('state'));
    callback.searchParams.set('code', 'unit-test-code');
    const finish = c => oauth.handle(new Request(callback, { headers: { cookie: c } }), host, marker, issue);
    return { access, finish, cookie, revoked: () => revoked };
}

test('first owner redeems once in the same browser and registers on the project', async t => {
    const f = await fixture(t);
    assert.equal((await f.finish('')).status, 403);
    const result = await f.finish(f.cookie);
    assert.equal(result.status, 303);
    const setup = new URL(result.headers.get('location'), origin);
    assert.equal(setup.origin, origin);
    assert.equal(setup.pathname, '/setup');
    assert.equal(f.access.setupSecretValid(setup.hash.slice(1)), true);
    const engineId = 'a'.repeat(26);
    const gateway = new Gateway({ access: f.access, engineId, fingerprint: deriveEngineFingerprint(engineId),
        api: async () => new Response(), documents: async () => new Response() });
    const post = (path, data) => gateway.handle(new Request(origin + path, { method: 'POST',
        headers: { host, origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: JSON.stringify(data) }),
        { hostname: host, clientIp: '127.0.0.1' });
    const secret = setup.hash.slice(1);
    const options = await post('/setup/options', { secret });
    assert.equal(options.status, 200);
    const response = await createPasskey((await options.json()).options, origin);
    const owner = await post('/setup/verify', { secret, response });
    assert.equal(owner.status, 200);
    assert.match(owner.headers.get('set-cookie'), /__Host-ptbk_session=/);
    assert.equal(f.access.passkeys().length, 1);
    assert.equal(f.access.canBootstrapOwner, false);
    await f.access.resetOwner();
    assert.equal(f.access.canBootstrapOwner, false);
    await assert.rejects(f.access.createSetupSecret(true));
    assert.equal((await f.finish(f.cookie)).status, 403);
    assert.equal(f.revoked(), 1);
});

for (const mismatch of ['user', 'team', 'droplet']) {
    test('refuses mismatched ' + mismatch, async t => {
        const f = await fixture(t, mismatch);
        assert.equal((await f.finish(f.cookie)).status, 403);
        assert.equal(f.revoked(), 1);
    });
}
