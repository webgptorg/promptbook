import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';

/**
 * Successful scope resolution for user-chat API handlers.
 */
export type ResolvedUserChatScope = {
    userId: number;
    agentPermanentId: string;
};

/**
 * Error variants while resolving user-chat scope.
 */
export type UserChatScopeResolutionError = 'UNAUTHORIZED' | 'AGENT_NOT_FOUND';

/**
 * Resolves current authenticated user and canonical agent permanent id.
 */
export async function resolveUserChatScope(
    agentIdentifier: string,
): Promise<{ ok: true; scope: ResolvedUserChatScope } | { ok: false; error: UserChatScopeResolutionError }> {
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
                agentPermanentId,
            },
        };
    } catch {
        return { ok: false, error: 'AGENT_NOT_FOUND' };
    }
}
