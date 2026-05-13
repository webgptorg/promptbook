import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { UserChatJobRow } from '../userChat/UserChatJobRow';
import type { UserChatRecord } from '../userChat/UserChatRecord';
import { mapUserChatJobRow } from '../userChat/mapUserChatJobRow';
import { provideUserChatJobTable } from '../userChat/provideUserChatJobTable';
import { getExternalUserChatJobMetadata, isExternalUserChatJob } from './ExternalUserChatJobMetadata';
import { processExternalUserChatJob } from './processExternalUserChatJob';

/**
 * Synchronizes external runner jobs for one chat detail request.
 */
export async function synchronizeExternalUserChatJobsForChat(chat: UserChatRecord): Promise<boolean> {
    const jobs = await listSynchronizableExternalUserChatJobs({
        userId: chat.userId,
        agentPermanentId: chat.agentPermanentId,
        chatId: chat.id,
        limit: 50,
    });

    return await processSynchronizableExternalUserChatJobs(jobs);
}

/**
 * Synchronizes a bounded set of external runner jobs for admin/task-manager polling.
 */
export async function synchronizeExternalUserChatJobsForAdmin(): Promise<boolean> {
    const jobs = await listSynchronizableExternalUserChatJobs({ limit: 50 });
    return await processSynchronizableExternalUserChatJobs(jobs);
}

/**
 * Processes a list of synchronizable external jobs.
 */
async function processSynchronizableExternalUserChatJobs(jobs: ReadonlyArray<UserChatJobRecord>): Promise<boolean> {
    let didMutate = false;

    for (const job of jobs) {
        const result = await processExternalUserChatJob(job);
        didMutate = didMutate || result.didMutate;
    }

    return didMutate;
}

/**
 * Lists jobs whose repository state can still change the UI-visible status.
 */
async function listSynchronizableExternalUserChatJobs(options: {
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
        throw new Error(`Failed to list synchronizable external chat jobs: ${error.message}`);
    }

    return ((data || []) as Array<UserChatJobRow>)
        .map((row) => mapUserChatJobRow(row))
        .filter((job) => isExternalUserChatJob(job) || getExternalUserChatJobMetadata(job));
}
