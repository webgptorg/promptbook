import { createUserChatJobFailureDetails } from './createUserChatJobFailureDetails';
import { EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON } from './userChatJobState';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { listExpiredRunningUserChatJobs } from './listExpiredRunningUserChatJobs';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';

/**
 * Marks expired running jobs as failed so readers stop seeing stale in-flight work.
 *
 * @private function of `userChat`
 */
export async function recoverExpiredRunningUserChatJobs(): Promise<number> {
    const expiredJobs = await listExpiredRunningUserChatJobs();

    for (const expiredJob of expiredJobs) {
        const failureDetails = createUserChatJobFailureDetails({
            job: expiredJob,
            summary: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
            source: 'recoverExpiredRunningUserChatJobs',
            provider: expiredJob.provider,
        });

        await persistUserChatJobTerminalState({
            job: expiredJob,
            status: 'FAILED',
            failureReason: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
            failureDetails,
        }).catch(async (error) => {
            console.error('[user-chat-job] stale job recovery failed', {
                chatId: expiredJob.chatId,
                messageId: expiredJob.userMessageId,
                jobId: expiredJob.id,
                error,
            });

            await finalizeUserChatJob({
                jobId: expiredJob.id,
                status: 'FAILED',
                failureReason: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
                failureDetails,
            });
        });
    }

    return expiredJobs.length;
}
