import {
    createUserChatProgressCard,
    type UserChatProgressContext,
    type UserChatProgressPhase,
} from './userChatProgressCard';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';

/**
 * Persists one durable chat progress phase onto the active assistant placeholder.
 *
 * The optional `context` carries real runtime details (agent name, provider, tool count,
 * attachments, integrations) so the persisted progress card reflects what the worker is
 * actually doing on this turn instead of a fixed scripted summary.
 */
export async function persistUserChatJobProgressCard(options: {
    readonly userId: number;
    readonly agentPermanentId: string;
    readonly chatId: string;
    readonly assistantMessageId: string;
    readonly phase: UserChatProgressPhase;
    readonly context?: UserChatProgressContext;
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
                progressCard: createUserChatProgressCard(options.phase, options.context),
            };
        },
    });
}
