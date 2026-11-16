import { api, type ContractResponse } from '../../vendor/app-platform.js';
import type { AccessStore, Actor, Role, StoredMember } from '../web/access.js';

/** Access-related handlers use only gateway state, so they also work before project initialization. @private App API */
export type MemberContext = { readonly access: AccessStore; readonly actor: Actor; readonly params: Readonly<Record<string, unknown>>; readonly query: Readonly<Record<string, unknown>>; readonly body: unknown };

/** Actions audited on permission and step-up refusals. @private App API */
export const MEMBER_ACTIONS: Readonly<Record<string, { readonly action: string; readonly kind?: string; readonly param?: string }>> = {
    approveAccessRequest: { action: 'access-request.approve', kind: 'access-request', param: 'accessRequestId' },
    declineAccessRequest: { action: 'access-request.decline', kind: 'access-request', param: 'accessRequestId' },
    setDashboardRemovals: { action: 'settings.dashboard-removals' },
    updateMember: { action: 'member.update', kind: 'member', param: 'memberId' },
    removeMember: { action: 'member.remove', kind: 'member', param: 'memberId' },
    createInvite: { action: 'invite.create' },
    revokeInvite: { action: 'invite.revoke', kind: 'invite', param: 'inviteId' },
    retryChatReply: { action: 'chat.reply.retry', kind: 'chat', param: 'chatId' },
};

/** The member contract never includes credentials or internal join tracking. @private App API */
export function memberView(member: StoredMember, access: AccessStore): Record<string, unknown> {
    return { id: member.id, displayName: member.displayName, role: member.role, status: member.status, createdAt: member.createdAt, lastSeenAt: member.lastSeenAt, passkeyCount: access.passkeys(member.id).length, dashboardUserId: member.dashboardUserId ?? null };
}

/** Successful contract response. */
function ok(data: unknown): ContractResponse { return { kind: 'ok', data }; }
/** Fixed protocol problem, without internal state. */
function fail(code: string): ContractResponse { return { kind: 'problem', problem: api.createProblem(code) }; }

/** Member management and access-request API over durable gateway transitions. @private App API */
export function memberHandlers(hostname: () => string | undefined, page: (items: readonly unknown[], query: Readonly<Record<string, unknown>>) => ContractResponse): Readonly<Record<string, (context: MemberContext) => Promise<ContractResponse>>> {
    return {
        listAccessRequests: async ({ access, query }) => { await access.settle(); return page(access.accessRequests(), query); },
        approveAccessRequest: async ({ access, actor, params, body }) => {
            const input = body as { code: string; role: Role };
            const result = await access.approveAccess(String(params.accessRequestId), input.code, input.role, actor);
            return result.kind === 'approved' ? ok(memberView(result.member, access)) : fail(result.kind);
        },
        declineAccessRequest: async ({ access, actor, params }) => await access.declineAccess(String(params.accessRequestId), actor) ? ok(null) : fail('not-found'),
        setDashboardRemovals: async ({ access, actor, body }) => { const { enabled } = body as { enabled: boolean }; await access.setDashboardRemovals(enabled, actor); return ok({ enabled }); },
        updateMember: async ({ access, actor, params, body }) => {
            const result = await access.updateMember(String(params.memberId), (body as { role: Role }).role, actor);
            return result.kind === 'updated' ? ok(memberView(result.member, access)) : fail(result.kind);
        },
        removeMember: async ({ access, actor, params }) => { const result = await access.removeMember(String(params.memberId), actor); return result.kind === 'removed' ? ok(null) : fail(result.kind); },
        listInvites: async ({ access, query }) => page(access.invites(), query),
        createInvite: async ({ access, actor, body }) => {
            const host = hostname(); if (!host) return fail('unavailable');
            const input = body as { role: Role; expiresAt: string };
            const { invite, secret } = await access.createInvite({ ...input, createdBy: actor.memberId }, actor);
            return ok({ invite, inviteUrl: `https://${host}${api.JOIN_PATH}#${secret}` });
        },
        revokeInvite: async ({ access, actor, params }) => await access.revokeInvite(String(params.inviteId), actor) ? ok(null) : fail('not-found'),
    };
}
