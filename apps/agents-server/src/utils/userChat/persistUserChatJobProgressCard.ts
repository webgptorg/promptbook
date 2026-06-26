import { createUserChatProgressCard, type UserChatProgressPhase } from './userChatProgressCard';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';

/**
 * Persists one durable chat progress phase onto the active assistant placeholder.
 */
export async function persistUserChatJobProgressCard(options: {
    readonly userId: number;
    readonly agentPermanentId: string;
    readonly chatId: string;
    readonly assistantMessageId: string;
    readonly phase: UserChatProgressPhase;
}): Promise<void> {
    await updateUserChatAssistantMessage({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        assistantMessageId: options.assistantMessageId,
        mutateMessage: (message) => {
            const lifecycleState = options.phase === 'queued' ? 'queued' : 'running';

            return {
                ...message,
                lifecycleState,
                lifecycleError: undefined,
                isComplete: false,
                progressCard: createUserChatProgressCard(options.phase),
            };
        },
    });
}
