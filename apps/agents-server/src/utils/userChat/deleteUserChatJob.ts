import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Deletes one durable chat job by id.
 *
 * Used only for best-effort cleanup when enqueueing fails mid-flight.
 */
export async function deleteUserChatJob(jobId: string): Promise<void> {
    const userChatJobTable = await provideUserChatJobTable();
    const { error } = await userChatJobTable.delete().eq('id', jobId);

    if (error) {
        throw new Error(`Failed to delete user chat job "${jobId}": ${error.message}`);
    }
}
