import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { canAccessAgentVisibility, resolveAgentVisibility } from '@/src/utils/agentAccess';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';

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
 * Resolves current authenticated user and canonical agent permanent id.
 */
export async function resolveUserChatScope(
    agentIdentifier: string,
): Promise<{ ok: true; scope: ResolvedUserChatScope } | { ok: false; error: UserChatScopeResolutionError }> {
    ensureUserChatTimeoutWorkerBootstrapped();

    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return { ok: false, error: 'UNAUTHORIZED' };
    }

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentPermanentId = await collection.getAgentPermanentId(agentIdentifier);
        const visibility = await resolveAgentVisibility(agentPermanentId);
        const isAllowed = canAccessAgentVisibility({
            visibility,
            currentUser: currentUserIdentity.sessionUser,
        });

        if (!isAllowed) {
            return { ok: false, error: 'FORBIDDEN' };
        }

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
