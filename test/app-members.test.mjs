import assert from 'node:assert/strict';
import { readFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { AccessStore } from '../dist/app/web/access.js';
import { temporaryDirectory } from './helpers.mjs';

/** A verified credential substitute for state-machine tests; gateway tests perform real WebAuthn. */
const credential = (id) => ({ credentialId: id, name: 'Passkey', publicKey: 'AA', counter: 0, transports: [], attachment: null, backedUp: false, rpId: 'engine.test' });
/** Dashboard claims already verified by the gateway. */
const ticket = (id, user = id) => ({ v: 1, engineId: 'aaaaaaaaaaaaaaaaaaaaaaaaaa', ticketId: id.padEnd(22, '_'), dashboardUserId: user, displayName: user, email: `${user}@example.test`, proposedRole: 'member', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600_000).toISOString() });

test('access state: rejected persistence cannot grant access; later writes recover', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk access failure');
    const access = await AccessStore.open(directory);
    const owner = await access.addMember({ displayName: 'Owner', role: 'owner' });
    await rename(join(directory, 'access.json'), join(directory, 'saved.json'));
    await mkdir(join(directory, 'access.json'));
    await assert.rejects(access.addMember({ displayName: 'Ghost', role: 'owner' }));
    assert.deepEqual(access.members().map(member => member.id), [owner.id]);
    const { rm } = await import('node:fs/promises');
    await rm(join(directory, 'access.json'), { recursive: true });
    await rename(join(directory, 'saved.json'), join(directory, 'access.json'));
    await access.addMember({ displayName: 'Viewer', role: 'viewer' });
    assert.equal((await AccessStore.open(directory)).members().length, 2);
});

test('access requests: one-use tickets, code attempts and restart preserve the owner', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk access requests');
    let access = await AccessStore.open(directory);
    const secret = await access.createSetupSecret();
    const { member: owner } = await access.completeSetup(secret.secret, credential('owner-key'));
    const claims = ticket('ticket-one');
    const joined = await access.requestAccess(claims, credential('member-key'));
    assert.equal(joined.kind, 'waiting');
    assert.equal(access.members().length, 1);
    assert.ok(!JSON.stringify(access.accessRequests()).includes(joined.code));
    const stored = await readFile(join(directory, 'access.json'), 'utf8');
    assert.ok(!stored.includes(joined.request), 'poll token must only be stored hashed');
    access = await AccessStore.open(directory);
    assert.equal(access.member(owner.id).role, 'owner');
    assert.equal(access.passkeys(owner.id).length, 1);
    assert.equal((await access.requestAccess(claims, credential('other-key'))).kind, 'used');
    const request = access.accessRequests()[0];
    const outcomes = await Promise.all([access.approveAccess(request.id, joined.code, 'member'), access.approveAccess(request.id, joined.code, 'member')]);
    assert.equal(outcomes.filter(result => result.kind === 'approved').length, 1);
    assert.equal(access.members().length, 2);
    const first = await access.joinStatus(joined.request, { ip: '127.0.0.1', userAgent: 'test' });
    assert.equal(first.kind, 'approved');
    assert.equal((await access.joinStatus(joined.request, { ip: '127.0.0.1', userAgent: 'test' })).kind, 'unknown');
    const member = access.members().find(item => item.dashboardUserId === claims.dashboardUserId);
    await access.removeMember(member.id);
    assert.equal(access.authenticate(first.token, { ip: '127.0.0.1', userAgent: 'test' }), undefined);
    assert.equal(access.passkeys(member.id).length, 0);
    assert.equal((await access.removeMember(owner.id)).kind, 'last-owner');
});

test('access requests: five wrong codes decline, replacement closes the old request, and acks survive restart', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk access codes');
    const access = await AccessStore.open(directory);
    await access.addMember({ displayName: 'Owner', role: 'owner' });
    const first = await access.requestAccess(ticket('ticket-a', 'person'), credential('key-a'));
    const second = await access.requestAccess(ticket('ticket-b', 'person'), credential('key-b'));
    assert.equal((await access.joinStatus(first.request, null)).kind, 'declined');
    assert.equal(access.accessRequests().length, 1);
    const request = access.accessRequests()[0];
    const wrong = second.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) assert.equal((await access.approveAccess(request.id, wrong, 'member')).kind, 'access-code-mismatch');
    assert.equal(access.accessRequests().length, 0);
    assert.equal((await access.joinStatus(second.request, null)).kind, 'declined');
    const reopened = await AccessStore.open(directory);
    assert.deepEqual(reopened.acks().map(ack => ack.outcome), ['declined', 'declined']);
    const sent = reopened.acks();
    await reopened.acknowledge(sent);
    assert.equal((await AccessStore.open(directory)).acks().length, 0);
});

test('members: concurrent demotions preserve the last owner and invite secrets are consumable', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk member roles');
    const access = await AccessStore.open(directory);
    const a = await access.addMember({ displayName: 'A', role: 'owner' });
    const b = await access.addMember({ displayName: 'B', role: 'owner' });
    const changed = await Promise.all([access.updateMember(a.id, 'member'), access.updateMember(b.id, 'member')]);
    assert.equal(changed.filter(item => item.kind === 'last-owner').length, 1);
    const invite = await access.createInvite({ role: 'viewer', expiresAt: new Date(Date.now() + 60_000).toISOString(), createdBy: b.id });
    assert.ok(!JSON.stringify(access.invites()).includes(invite.secret));
    const accepted = await access.acceptInvite(invite.secret, credential('invited-key'));
    assert.equal(accepted.kind, 'approved');
    assert.equal(accepted.member.role, 'viewer');
    assert.equal((await access.acceptInvite(invite.secret, credential('repeat-key'))).kind, 'invalid');
});

test('members: a queued role change invalidates a previously authenticated approver', async t => {
    const directory = await temporaryDirectory(t, 'ptbk stale authority');
    const access = await AccessStore.open(directory);
    await access.addMember({displayName:'Owner',role:'owner'});
    const admin = await access.addMember({displayName:'Admin',role:'admin'});
    const signed = await access.signIn(admin.id,null,null);
    const actor = access.authenticate(signed.token,{ip:'127.0.0.1',userAgent:'test'});
    const joined = await access.requestAccess(ticket('queued-ticket'),credential('queued-key'));
    const request = access.accessRequests()[0];
    const demotion = access.updateMember(admin.id,'viewer');
    await assert.rejects(access.approveAccess(request.id,joined.code,'owner',actor),error=>error.code==='forbidden');
    await demotion;
    assert.equal(access.accessRequests().length,1);
    assert.equal(access.members().length,2);
});

test('dashboard revocations: stale joins, disabled policy, pending requests, duplicate deliveries and durable acknowledgments', async t => {
    const directory = await temporaryDirectory(t,'ptbk revocations');
    const access = await AccessStore.open(directory);
    await access.addMember({displayName:'Owner',role:'owner'});
    const joined = await access.requestAccess(ticket('revoked-ticket','person'),credential('revoked-key'));
    await access.approveAccess(access.accessRequests()[0].id,joined.code,'member');
    const member = access.members().find(m=>m.dashboardUserId==='person');
    const revocation = (id,at=new Date().toISOString())=>({revocationId:id,dashboardUserId:'person',issuedAt:at});
    assert.equal(await access.applyRevocation(revocation('old',new Date(Date.now()-600000).toISOString())),'not-found');
    assert.equal(access.member(member.id).status,'active');
    await access.setDashboardRemovals(false);
    assert.equal(await access.applyRevocation(revocation('disabled')),'refused-disabled');
    await access.setDashboardRemovals(true);
    assert.equal(await access.applyRevocation(revocation('fresh')),'revoked');
    assert.equal(access.passkeys(member.id).length,0);
    const reopened = await AccessStore.open(directory);
    assert.equal(await reopened.applyRevocation(revocation('fresh')),'revoked');
    const waiting = await reopened.requestAccess(ticket('new-ticket','person'),credential('new-key'));
    await reopened.setDashboardRemovals(false);
    await reopened.applyRevocation(revocation('pending'));
    assert.equal((await reopened.joinStatus(waiting.request,null)).kind,'declined');
    const sent = reopened.acks();
    await reopened.acknowledge(sent.slice(0,1));
    assert.equal((await AccessStore.open(directory)).acks().length,sent.length-1);
});
