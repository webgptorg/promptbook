import { recoverExpiredRunningUserChatJobs } from '@/src/utils/userChat/recoverExpiredRunningUserChatJobs';
import { recoverExpiredRunningUserChatTimeouts } from '@/src/utils/userChatTimeout';
import { synchronizeLocalUserChatJobsForAdmin } from '../localChatRunner/synchronizeLocalUserChatJobs';

/**
 * Minimum interval between recovery operations triggered by admin polls.
 *
 * @private function of `getAdminChatTasksResponse`
 */
const ADMIN_RECOVERY_THROTTLE_MS = 60_000;

/**
 * Timestamp of the last completed admin recovery run.
 *
 * @private function of `getAdminChatTasksResponse`
 */
let lastAdminRecoveryAt = 0;

/**
 * In-flight recovery promise used to deduplicate overlapping admin polls.
 *
 * @private function of `getAdminChatTasksResponse`
 */
let pendingAdminRecovery: Promise<void> | null = null;

/**
 * Runs recovery operations at most once per throttle interval, deduplicating concurrent calls.
 *
 * @private function of `getAdminChatTasksResponse`
 */
export async function throttledAdminRecovery(): Promise<void> {
    if (Date.now() - lastAdminRecoveryAt < ADMIN_RECOVERY_THROTTLE_MS) {
        return;
    }

    if (pendingAdminRecovery) {
        return pendingAdminRecovery;
    }

    pendingAdminRecovery = (async () => {
        try {
            await synchronizeLocalUserChatJobsForAdmin();
            await recoverExpiredRunningUserChatJobs();
            await recoverExpiredRunningUserChatTimeouts();
            lastAdminRecoveryAt = Date.now();
        } finally {
            pendingAdminRecovery = null;
        }
    })();

    return pendingAdminRecovery;
}
