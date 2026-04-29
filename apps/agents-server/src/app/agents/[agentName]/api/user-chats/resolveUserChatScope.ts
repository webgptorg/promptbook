import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveAgentVisibilityAccess } from '@/src/utils/agentAccess';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import { NextResponse } from 'next/server';

/**
 * Successful scope resolution for user-chat API handlers.
 */
export type ResolvedUserChatScope = {
    userId: number;
    viewerIsAdmin: boolean;
    agentPermanentId: string;
};

/**
 * Error variants while resolving user-chat scope.
 */
export type UserChatScopeResolutionError = 'UNAUTHORIZED' | 'FORBIDDEN' | 'AGENT_NOT_FOUND';

/**
 * Creates the standard JSON response for a failed user-chat scope resolution.
 *
 * @param error - Scope resolution error.
 * @returns JSON error response with the matching HTTP status.
 */
export function createUserChatScopeErrorResponse(error: UserChatScopeResolutionError): NextResponse {
    if (error === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
}

/**
 * Resolves current authenticated user and canonical agent permanent id.
 */
export async function resolveUserChatScope(
    agentIdentifier: string,
    request?: Request,
): Promise<{ ok: true; scope: ResolvedUserChatScope } | { ok: false; error: UserChatScopeResolutionError }> {
    ensureUserChatTimeoutWorkerBootstrapped();

    const access = await resolveAgentVisibilityAccess({ agentIdentifier, request });
    if (!access.isAllowed) {
        return { ok: false, error: 'FORBIDDEN' };
    }

    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return { ok: false, error: 'UNAUTHORIZED' };
    }

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentPermanentId = await collection.getAgentPermanentId(agentIdentifier);

        return {
            ok: true,
            scope: {
                userId: currentUserIdentity.userId,
                viewerIsAdmin: currentUserIdentity.isAdmin,
                agentPermanentId,
            },
        };
    } catch {
        return { ok: false, error: 'AGENT_NOT_FOUND' };
    }
}
