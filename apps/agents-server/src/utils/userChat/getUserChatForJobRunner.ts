import { getUserChat } from './getUserChat';
import type { UserChatRecord } from './UserChatRecord';

/**
 * Job identity a background runner needs to load the chat it is about to answer.
 */
export type UserChatJobRunnerChatIdentity = {
    readonly userId: number;
    readonly agentPermanentId: string;
    readonly chatId: string;
};

/**
 * Loads the chat one durable job belongs to, on behalf of the background runner executing it.
 *
 * `getUserChat` answers a *viewer* and therefore discloses the externally created chat sources -
 * `EMAIL`, `OPENAI_API` and `TEAM_MEMBER` - to administrators only. A background runner is not a
 * viewer: it already owns the job, runs under the job owner's identity, and has to read every chat
 * source. Without this distinction each externally created job is cancelled as if its chat had been
 * deleted, so every inbound email stays unanswered.
 */
export async function getUserChatForJobRunner(job: UserChatJobRunnerChatIdentity): Promise<UserChatRecord | null> {
    return await getUserChat({
        userId: job.userId,
        // Note: The runner is trusted machinery behind an already-persisted job, not a person browsing
        //       somebody else's conversation
        viewerIsAdmin: true,
        agentPermanentId: job.agentPermanentId,
        chatId: job.chatId,
    });
}
