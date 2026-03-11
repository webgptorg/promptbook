import type { UpdateUserChatDraftOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { createMissingUserChatScopeError } from './createMissingUserChatScopeError';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';

/**
 * Updates the draft message for a user chat without modifying messages or activity timestamps.
 *
 * @private internal utility of <AgentProfileChat/>
 */
export async function updateUserChatDraft(options: UpdateUserChatDraftOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId, draftMessage } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .update({
            draftMessage,
        })
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to update user chat draft "${chatId}": ${error.message}`);
    }

    if (!data) {
        throw await createMissingUserChatScopeError(userChatTable, {
            operation: 'update_draft',
            userId,
            agentPermanentId,
            chatId,
        });
    }

    return mapUserChatRow(data as UserChatRow);
}
