import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Loads one durable chat job by its global id.
 *
 * @private function of `userChat`
 */
export async function getUserChatJobById(jobId: string): Promise<UserChatJobRecord | null> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable.select('*').eq('id', jobId).maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat job "${jobId}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
