import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import type { provideUserChatTable } from './provideUserChatTable';
import { UserChatScopeError } from './UserChatScopeError';
import type { UserChatRow } from './UserChatRow';

/**
 * Input used to diagnose one missing scoped user-chat row.
 */
export type MissingUserChatScopeErrorOptions = {
    operation: 'update_messages' | 'update_draft';
    userId: number;
    agentPermanentId: string;
    chatId: string;
};

/**
 * Minimal row fields needed for scope diagnostics.
 */
type UserChatScopeDiagnosticRow = Pick<UserChatRow, 'id' | 'userId' | 'agentPermanentId'>;

/**
 * Supabase table client shape for `UserChat` diagnostics.
 */
type UserChatTable = Awaited<ReturnType<typeof provideUserChatTable>>;

/**
 * Builds a detailed branded error when scoped `UserChat` lookup returns no row.
 */
export async function createMissingUserChatScopeError(
    userChatTable: UserChatTable,
    options: MissingUserChatScopeErrorOptions,
): Promise<UserChatScopeError> {
    const { operation, userId, agentPermanentId, chatId } = options;
    const { data: matchingById, error: diagnosticsError } = await userChatTable
        .select('id,userId,agentPermanentId')
        .eq('id', chatId)
        .maybeSingle();

    if (diagnosticsError) {
        return new UserChatScopeError(
            'USER_CHAT_SCOPE_DIAGNOSTICS_FAILED',
            spaceTrim((block) => `
                Chat save failed because diagnostics for chat \`${chatId}\` could not be loaded.
                
                **Classification:** Database diagnostics query failed.
                **Operation:** \`${operation}\`
                **Requested scope:** user \`${userId}\`, agent \`${agentPermanentId}\`
                
                Database error:
                ${block(diagnosticsError.message)}
            `),
            {
                operation,
                requestedScope: {
                    userId,
                    agentPermanentId,
                    chatId,
                },
                locatedScope: null,
                likelyCause: 'Database diagnostics query failed while classifying a missing scoped chat.',
                databaseErrorMessage: diagnosticsError.message,
            },
        );
    }

    const locatedScope = matchingById
        ? {
              userId: Number((matchingById as UserChatScopeDiagnosticRow).userId),
              agentPermanentId: String((matchingById as UserChatScopeDiagnosticRow).agentPermanentId),
              chatId: String((matchingById as UserChatScopeDiagnosticRow).id),
          }
        : null;

    if (!locatedScope) {
        return new UserChatScopeError(
            'USER_CHAT_NOT_FOUND',
            spaceTrim(`
                Chat save failed because chat \`${chatId}\` does not exist.
                
                **Classification:** Missing database row.
                **Operation:** \`${operation}\`
                **Requested scope:** user \`${userId}\`, agent \`${agentPermanentId}\`
            `),
            {
                operation,
                requestedScope: {
                    userId,
                    agentPermanentId,
                    chatId,
                },
                locatedScope: null,
                likelyCause: 'Chat row was deleted or the chat identifier is stale.',
            },
        );
    }

    if (locatedScope.agentPermanentId !== agentPermanentId) {
        return new UserChatScopeError(
            'USER_CHAT_SCOPE_AGENT_MISMATCH',
            spaceTrim(`
                Chat save failed because chat \`${chatId}\` belongs to a different agent scope.
                
                **Classification:** Agent scope mismatch.
                **Requested agent:** \`${agentPermanentId}\`
                **Located agent:** \`${locatedScope.agentPermanentId}\`
            `),
            {
                operation,
                requestedScope: {
                    userId,
                    agentPermanentId,
                    chatId,
                },
                locatedScope,
                likelyCause: 'The current route agent differs from the agent that owns the chat.',
            },
        );
    }

    if (locatedScope.userId !== userId) {
        return new UserChatScopeError(
            'USER_CHAT_SCOPE_USER_MISMATCH',
            spaceTrim(`
                Chat save failed because chat \`${chatId}\` belongs to a different user scope.
                
                **Classification:** User identity mismatch.
                **Requested userId:** \`${userId}\`
                **Located userId:** \`${locatedScope.userId}\`
                
                This usually means the anonymous/session identity changed between chat load and save.
            `),
            {
                operation,
                requestedScope: {
                    userId,
                    agentPermanentId,
                    chatId,
                },
                locatedScope,
                likelyCause: 'Anonymous/session identity changed between chat creation and persistence.',
            },
        );
    }

    return new UserChatScopeError(
        'USER_CHAT_SCOPE_INCONSISTENT',
        spaceTrim(`
            Chat save failed due to inconsistent scope resolution for chat \`${chatId}\`.
            
            **Classification:** Scope inconsistency.
            The row exists for the same user and agent, but scoped lookup still returned no row.
        `),
        {
            operation,
            requestedScope: {
                userId,
                agentPermanentId,
                chatId,
            },
            locatedScope,
            likelyCause: 'Non-deterministic query scope or transient database inconsistency.',
        },
    );
}
