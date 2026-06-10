import type { UserChatRow } from './UserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import type { UserChatJobRow } from './UserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';
import { ACTIVE_USER_CHAT_TIMEOUT_STATUSES } from '../userChatTimeout/userChatTimeoutStore/ACTIVE_USER_CHAT_TIMEOUT_STATUSES';
import { isMissingUserChatTimeoutRelationError } from '../userChatTimeout/userChatTimeoutStore/isMissingUserChatTimeoutRelationError';
import { provideUserChatTimeoutTable } from '../userChatTimeout/userChatTimeoutStore/provideUserChatTimeoutTable';
import type { UserChatTimeoutRow } from '../userChatTimeout/UserChatTimeoutRecord';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Active user-chat job statuses that keep the live chat stream in a faster polling mode.
 */
const ACTIVE_USER_CHAT_JOB_STATUSES = ['QUEUED', 'RUNNING'] as const;

/**
 * Compact active-job shape used only for revision comparison.
 */
export type UserChatRevisionJob = Pick<UserChatJobRow, 'id' | 'status' | 'cancelRequestedAt'>;

/**
 * Compact active-timeout shape used only for revision comparison.
 */
export type UserChatRevisionTimeout = Pick<
    UserChatTimeoutRow,
    'id' | 'status' | 'message' | 'dueAt' | 'cancelRequestedAt'
>;

/**
 * Lightweight revision metadata for detecting whether a chat detail payload changed.
 */
export type UserChatRevision = {
    id: string;
    updatedAt: string;
    draftMessage: string | null;
    source: UserChatRow['source'];
    activeJobs: Array<UserChatRevisionJob>;
    activeTimeouts: Array<UserChatRevisionTimeout>;
};

/**
 * Loads one scoped chat revision without hydrating the full `messages` JSON payload.
 */
export async function getUserChatRevision(options: {
    userId: number;
    viewerIsAdmin?: boolean;
    agentPermanentId: string;
    chatId: string;
}): Promise<UserChatRevision | null> {
    const { userId, viewerIsAdmin = false, agentPermanentId, chatId } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .select('id, userId, updatedAt, draftMessage, source')
        .eq('id', chatId)
        .eq('agentPermanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat revision "${chatId}": ${error.message}`);
    }

    if (!data) {
        return null;
    }

    const row = data as Pick<UserChatRow, 'id' | 'userId' | 'updatedAt' | 'draftMessage' | 'source'>;
    if (row.source === USER_CHAT_SOURCES.WEB_UI) {
        if (row.userId !== userId) {
            return null;
        }
    } else if (!viewerIsAdmin) {
        return null;
    }

    const [activeJobs, activeTimeouts] = await Promise.all([
        listUserChatRevisionActiveJobs({ userId: row.userId, agentPermanentId, chatId }),
        listUserChatRevisionActiveTimeouts({ userId: row.userId, agentPermanentId, chatId }),
    ]);

    return {
        id: row.id,
        updatedAt: row.updatedAt,
        draftMessage: row.draftMessage,
        source: row.source,
        activeJobs,
        activeTimeouts,
    };
}

/**
 * Lists only active job fields that affect the canonical chat surface.
 */
async function listUserChatRevisionActiveJobs(options: {
    userId: number;
    agentPermanentId: string;
    chatId: string;
}): Promise<Array<UserChatRevisionJob>> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .select('id, status, cancelRequestedAt')
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ACTIVE_USER_CHAT_JOB_STATUSES)
        .order('createdAt', { ascending: true });

    if (error) {
        throw new Error(`Failed to load active user chat job revisions for chat "${options.chatId}": ${error.message}`);
    }

    return (data || []) as Array<UserChatRevisionJob>;
}

/**
 * Lists only active timeout fields that affect the canonical chat surface.
 */
async function listUserChatRevisionActiveTimeouts(options: {
    userId: number;
    agentPermanentId: string;
    chatId: string;
}): Promise<Array<UserChatRevisionTimeout>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('id, status, message, dueAt, cancelRequestedAt')
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES)
        .is('pausedAt', null)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

        throw new Error(
            `Failed to load active user chat timeout revisions for chat "${options.chatId}": ${error.message}`,
        );
    }

    return (data || []) as Array<UserChatRevisionTimeout>;
}
