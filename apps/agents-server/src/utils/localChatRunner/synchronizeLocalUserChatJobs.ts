import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { UserChatJobRow } from '../userChat/UserChatJobRow';
import type { UserChatRecord } from '../userChat/UserChatRecord';
import { mapUserChatJobRow } from '../userChat/mapUserChatJobRow';
import { provideUserChatJobTable } from '../userChat/provideUserChatJobTable';
import { getLocalUserChatJobMetadata, isLocalUserChatJob } from './LocalUserChatJobMetadata';
import { processLocalUserChatJob } from './processLocalUserChatJob';

/**
 * Synchronizes local runner jobs for one chat detail request.
 */
export async function synchronizeLocalUserChatJobsForChat(chat: UserChatRecord): Promise<boolean> {
    const jobs = await listSynchronizableLocalUserChatJobs({
        userId: chat.userId,
        agentPermanentId: chat.agentPermanentId,
        chatId: chat.id,
        limit: 50,
    });

    return await processSynchronizableLocalUserChatJobs(jobs);
}

/**
 * Synchronizes a bounded set of local runner jobs for admin/task-manager polling.
 */
export async function synchronizeLocalUserChatJobsForAdmin(): Promise<boolean> {
    const jobs = await listSynchronizableLocalUserChatJobs({ limit: 50 });
    return await processSynchronizableLocalUserChatJobs(jobs);
}

/**
 * Processes a list of synchronizable local jobs.
 */
async function processSynchronizableLocalUserChatJobs(jobs: ReadonlyArray<UserChatJobRecord>): Promise<boolean> {
    let didMutate = false;

    for (const job of jobs) {
        const result = await processLocalUserChatJob(job);
        didMutate = didMutate || result.didMutate;
    }

    return didMutate;
}

/**
 * Lists jobs whose local message-folder state can still change the UI-visible status.
 */
async function listSynchronizableLocalUserChatJobs(options: {
    userId?: number;
    agentPermanentId?: string;
    chatId?: string;
    limit: number;
}): Promise<Array<UserChatJobRecord>> {
    const userChatJobTable = await provideUserChatJobTable();
    let query = userChatJobTable
        .select('*')
        .in('status', ['RUNNING', 'FAILED'])
        .order('updatedAt', { ascending: false })
        .limit(options.limit);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    if (options.agentPermanentId) {
        query = query.eq('agentPermanentId', options.agentPermanentId);
    }

    if (options.chatId) {
        query = query.eq('chatId', options.chatId);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to list synchronizable local chat jobs: ${error.message}`);
    }

    return ((data || []) as Array<UserChatJobRow>)
        .map((row) => mapUserChatJobRow(row))
        .filter((job) => isLocalUserChatJob(job) || getLocalUserChatJobMetadata(job));
}
