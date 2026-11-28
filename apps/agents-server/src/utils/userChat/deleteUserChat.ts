import type { DeleteUserChatOptions } from './UserChatRecord';
import { provideUserChatTable } from './provideUserChatTable';

/**
 * Deletes one user chat owned by the user.
 */
export async function deleteUserChat(options: DeleteUserChatOptions): Promise<boolean> {
    const { userId, agentPermanentId, chatId } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .delete()
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .select('id')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to delete user chat "${chatId}": ${error.message}`);
    }

    return Boolean(data);
}
