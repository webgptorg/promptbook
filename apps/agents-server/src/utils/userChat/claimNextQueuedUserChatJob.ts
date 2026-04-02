import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Number of queued jobs inspected per claim attempt.
 *
 * @private function of `userChat`
 */
const CLAIM_USER_CHAT_JOB_CANDIDATE_LIMIT = 20;

/**
 * Default lease duration assigned to one claimed running job.
 *
 * @private function of `userChat`
 */
export const USER_CHAT_JOB_LEASE_DURATION_MS = 2 * 60 * 1000;

/**
 * PostgreSQL unique violation code.
 *
 * @private function of `userChat`
 */
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

/**
 * Attempts to claim the next queued durable job for exclusive processing.
 */
export async function claimNextQueuedUserChatJob(options: {
    preferredJobId?: string;
} = {}): Promise<UserChatJobRecord | null> {
    const userChatJobTable = await provideUserChatJobTable();
    const candidateRows = await loadQueuedCandidateRows(userChatJobTable, options.preferredJobId);

    for (const candidateRow of candidateRows) {
        const claimedJob = await tryClaimUserChatJobRow(userChatJobTable, candidateRow);
        if (claimedJob) {
            return claimedJob;
        }
    }

    return null;
}

/**
 * Loads queued candidates ordered by queue time, optionally restricted to one preferred job.
 *
 * @private function of `userChat`
 */
async function loadQueuedCandidateRows(
    userChatJobTable: Awaited<ReturnType<typeof provideUserChatJobTable>>,
    preferredJobId?: string,
): Promise<Array<UserChatJobRow>> {
    if (preferredJobId) {
        const { data, error } = await userChatJobTable
            .select('*')
            .eq('id', preferredJobId)
            .eq('status', 'QUEUED')
            .is('cancelRequestedAt', null)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to load preferred queued user chat job "${preferredJobId}": ${error.message}`);
        }

        return data ? [data as UserChatJobRow] : [];
    }

    const { data, error } = await userChatJobTable
        .select('*')
        .eq('status', 'QUEUED')
        .is('cancelRequestedAt', null)
        .order('queuedAt', { ascending: true })
        .order('createdAt', { ascending: true })
        .limit(CLAIM_USER_CHAT_JOB_CANDIDATE_LIMIT);

    if (error) {
        throw new Error(`Failed to load queued user chat jobs: ${error.message}`);
    }

    return (data || []) as Array<UserChatJobRow>;
}

/**
 * Attempts one optimistic `QUEUED -> RUNNING` transition.
 *
 * @private function of `userChat`
 */
async function tryClaimUserChatJobRow(
    userChatJobTable: Awaited<ReturnType<typeof provideUserChatJobTable>>,
    candidateRow: UserChatJobRow,
): Promise<UserChatJobRecord | null> {
    const now = new Date();
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + USER_CHAT_JOB_LEASE_DURATION_MS).toISOString();

    const { data, error } = await userChatJobTable
        .update({
            status: 'RUNNING',
            updatedAt: nowIso,
            startedAt: candidateRow.startedAt || nowIso,
            lastHeartbeatAt: nowIso,
            leaseExpiresAt,
            attemptCount: candidateRow.attemptCount + 1,
            failureReason: null,
        })
        .eq('id', candidateRow.id)
        .eq('status', 'QUEUED')
        .select('*')
        .maybeSingle();

    if (error) {
        if (error.code === POSTGRES_UNIQUE_VIOLATION_CODE) {
            return null;
        }

        throw new Error(`Failed to claim user chat job "${candidateRow.id}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
