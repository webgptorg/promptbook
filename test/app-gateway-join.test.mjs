import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { AccessStore } from '../dist/app/web/access.js';
import { Gateway } from '../dist/app/web/gateway.js';
import { EngineApi } from '../dist/app/api/engine-api.js';
import { deriveEngineFingerprint } from '../dist/app/identity.js';
import { api, protocol } from '../dist/vendor/app-platform.js';
import { createPasskey } from './fixtures/webauthn.mjs';
import { temporaryDirectory } from './helpers.mjs';

/** Real gateway, API, cryptographic verification and persistence without a network listener. */
async function fixture(t, gatewayOptions = {}) {
    const root = await temporaryDirectory(t, 'gateway join');
    const access = await AccessStore.open(root);
    const signer = await protocol.createWebCryptoSigner(await protocol.generateEd25519KeyPair({ extractable: false }));
    const engineId = 'aaaaaaaaaaaaaaaaaaaaaaaaaa';
    const host = `${engineId}.engine.test`;
    const api = new EngineApi({ projectRoot: root, stateDirectory: join(root, 'api'), engineId: () => engineId, hostname: () => host, dashboardUrl: () => undefined, security: () => undefined, ui: () => ({}) });
    const gateway = new Gateway({ access, engineId, fingerprint: deriveEngineFingerprint(engineId), memberKey: signer.publicKey(), api: (req, actor) => api.handle(req, actor, access), documents: async () => new Response('signed in'), ...gatewayOptions });
    const call = async (path, body, cookie, method = 'POST', extra = {}) => {
        const response = await gateway.handle(new Request(`https://${host}${path}`, { method, headers: { host, origin: `https://${host}`, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...(cookie ? {cookie} : {}), ...extra }, ...(body === undefined ? {} : {body:JSON.stringify(body)}) }), {hostname:host,clientIp:'127.0.0.1'});
        const text = await response.text();
        return { status: response.status, body: text ? JSON.parse(text) : null, cookie: response.headers.get('set-cookie')?.split(';')[0] };
    };
    const token = async (overrides = {}, key = signer) => protocol.signAccessTicket(key, { v:1,engineId,ticketId:crypto.randomUUID().replaceAll('-',''),dashboardUserId:'person',displayName:'Person',email:'person@example.test',proposedRole:'member',issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),...overrides });
    const register = async (ticket) => { const options = await call('/auth/join/options',{ticket}); assert.equal(options.status,200,JSON.stringify(options)); const response = await createPasskey(options.body.options,`https://${host}`); return call('/auth/join/verify',{ticket,response}); };
    const setup = await access.createSetupSecret();
    const options = await call('/setup/options',{secret:setup.secret});
    const response = await createPasskey(options.body.options,`https://${host}`);
    const owner = await call('/setup/verify',{secret:setup.secret,response});
    assert.equal(owner.status,200,JSON.stringify(owner));
    return {root,access,call,token,register,ownerCookie:owner.cookie,gateway,host};
}

test('join: wrong-code answers carry the surviving attempts, including zero when the request closes', async t => {
    const {call,token,register,ownerCookie} = await fixture(t);
    const joined = await register(await token());
    const pending = await call('/api/v1/access-requests',undefined,ownerCookie,'GET');
    const id = pending.body.items[0].id;
    const wrong = joined.body.code === '000000' ? '000001' : '000000';
    for (let left = api.MAX_ACCESS_CODE_ATTEMPTS - 1; left >= 0; left--) {
        const result = await call(`/api/v1/access-requests/${id}/approve`,{code:wrong,role:'member'},ownerCookie);
        assert.equal(result.status,422);
        assert.equal(result.body.code,'access-code-mismatch');
        assert.equal(result.body.attemptsRemaining,left);
    }
    assert.equal((await call(`/api/v1/access-requests/${id}/approve`,{code:joined.body.code,role:'member'},ownerCookie)).status,404);
});

test('gateway: unfinished setup prints recovery commands for that onboarding engine', async t => {
    const {gateway,host} = await fixture(t,{onboarding:true});
    const response = await gateway.handle(new Request(`https://${host}/auth/sign-in`, {headers:{host}}),{hostname:host,clientIp:'127.0.0.1'});
    const html = await response.text();
    assert.equal(response.status,200);
    assert.ok(html.includes('ptbk connect --onboarding aaaaaaaaaaaaaaaaaaaaaaaaaa --setup-link'));
    assert.ok(html.includes('ptbk connect --onboarding aaaaaaaaaaaaaaaaaaaaaaaaaa --reset-owner'));
    assert.ok(html.includes('ptbk onboarding --id aaaaaaaaaaaaaaaaaaaaaaaaaa --json'));
    assert.doesNotMatch(html,/\{\{(?:setupLinkCommand|resetOwnerCommand|statusCommand)\}\}/);
});

test('join: actual WebAuthn, signed ticket, approval, session and removal run through the public gateway', async t => {
    const {root,access,call,token,register,ownerCookie} = await fixture(t);
    const ticket = await token();
    const joined = await register(ticket);
    assert.equal(joined.status,201,JSON.stringify(joined));
    assert.equal((await call('/api/v1/members',undefined,undefined,'GET')).status,401);
    const pending = await call('/api/v1/access-requests',undefined,ownerCookie,'GET');
    assert.equal(pending.status,200,JSON.stringify(pending));
    assert.ok(!JSON.stringify(pending.body).includes(joined.body.code));
    const request = pending.body.items[0];
    const approved = await call(`/api/v1/access-requests/${request.id}/approve`,{code:joined.body.code,role:'member'},ownerCookie);
    assert.equal(approved.status,201,JSON.stringify(approved));
    assert.equal(approved.body.dashboardUserId,'person');
    const status = await call('/auth/join/status',{request:joined.body.request});
    assert.equal(status.body.state,'approved');
    assert.ok(status.cookie);
    assert.equal((await call('/auth/join/status',{request:joined.body.request})).status,404);
    assert.equal((await call('/auth/join/options',{ticket})).body.code,'ticket-used');
    assert.equal((await call(`/api/v1/members/${approved.body.id}`,undefined,ownerCookie,'DELETE')).status,204);
    assert.equal((await call('/api/v1/members',undefined,status.cookie,'GET')).status,401);
    const owner = access.members()[0];
    assert.equal((await call(`/api/v1/members/${owner.id}`,undefined,ownerCookie,'DELETE')).body.code,'last-owner');
    const stored = await readFile(join(root,'access.json'),'utf8');
    assert.ok(!stored.includes(ticket)); assert.ok(!stored.includes(joined.body.request));
    assert.equal((await AccessStore.open(root)).member(owner.id).role,'owner');
});

test('join: forged, wrong-engine and expired tickets, cross-origin and challenge substitution are refused', async t => {
    const {call,token} = await fixture(t);
    const forger = await protocol.createWebCryptoSigner(await protocol.generateEd25519KeyPair({extractable:false}));
    assert.equal((await call('/auth/join/options',{ticket:await token({},forger)})).body.code,'ticket-invalid');
    assert.equal((await call('/auth/join/options',{ticket:await token({engineId:'bbbbbbbbbbbbbbbbbbbbbbbbbb'})})).body.code,'ticket-invalid');
    assert.equal((await call('/auth/join/options',{ticket:await token({issuedAt:new Date(Date.now()-700000).toISOString(),expiresAt:new Date(Date.now()-100000).toISOString()})})).body.code,'ticket-expired');
    const ticket = await token();
    assert.equal((await call('/auth/join/options',{ticket},undefined,'POST',{origin:'https://evil.test'})).status,403);
    assert.equal((await call('/auth/join/options?ticket=secret',{ticket})).status,400);
    const options = await call('/auth/join/options',{ticket});
    const response = await createPasskey(options.body.options,'https://aaaaaaaaaaaaaaaaaaaaaaaaaa.engine.test');
    assert.equal((await call('/auth/join/verify',{ticket:await token(),response})).status,400);
    assert.equal((await call('/auth/join/verify',{ticket,response})).status,400,'substituted challenge was consumed');
});

test('invites: the advertised link creates a real passkey, grants the selected role and cannot be reused', async t => {
    const {call,register,ownerCookie} = await fixture(t);
    const created = await call('/api/v1/invites',{role:'viewer',expiresAt:new Date(Date.now()+600000).toISOString()},ownerCookie);
    assert.equal(created.status,201,JSON.stringify(created));
    const ticket = new URL(created.body.inviteUrl).hash.slice(1);
    const joined = await register(ticket);
    assert.equal(joined.status,201);
    const status = await call('/auth/join/status',{request:joined.body.request});
    assert.equal(status.body.state,'approved');
    const members = await call('/api/v1/members',undefined,status.cookie,'GET');
    assert.equal(members.status,200);
    assert.ok(members.body.items.some(member => member.role === 'viewer' && member.passkeyCount === 1));
    assert.equal((await call('/auth/join/options',{ticket})).status,403);
    assert.equal((await call('/api/v1/invites',{role:'owner',expiresAt:new Date(Date.now()+600000).toISOString()},status.cookie)).status,403);
});
