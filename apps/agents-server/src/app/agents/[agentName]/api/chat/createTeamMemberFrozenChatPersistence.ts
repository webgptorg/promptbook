import type { ChatMessage } from '@promptbook-local/components';
import { persistFrozenUserChat, USER_CHAT_SOURCES } from '@/src/utils/userChat';
import type { ResolvedCurrentUserIdentity } from '@/src/utils/currentUserIdentity';

/**
 * Static persistence context for one stateless team-member chat request.
 */
type CreateTeamMemberFrozenChatPersistenceOptions = {
    isPrivateModeEnabled: boolean;
    currentRequestIdentity: ResolvedCurrentUserIdentity | null;
    agentId: string;
    thread?: ReadonlyArray<ChatMessage>;
    message: string;
    attachments: ChatMessage['attachments'];
};

/**
 * Input payload used to materialize one frozen stateless team-member chat transcript.
 */
type CreateFrozenTeamMemberChatMessagesOptions = {
    thread?: ReadonlyArray<ChatMessage>;
    userMessageContent: string;
    userAttachments: ChatMessage['attachments'];
    assistantContent?: string;
    includeAssistantPlaceholder?: boolean;
};

/**
 * Determines whether one stateless request should be recorded as an internal frozen team-member chat.
 */
function shouldPersistTeamMemberFrozenChat(identity: ResolvedCurrentUserIdentity | null): boolean {
    return Boolean(identity && !identity.isAnonymous);
}

/**
 * Creates the frozen stateless transcript persisted for team-member chats in the internal UI.
 */
function createFrozenTeamMemberChatMessages(options: CreateFrozenTeamMemberChatMessagesOptions): Array<ChatMessage> {
    const startedAt = Date.now();
    const normalizedThread = (options.thread || []).map((message, index) => ({
        ...message,
        id: message.id || `team-frozen-${index}`,
        createdAt:
            message.createdAt || (new Date(startedAt + index).toISOString() as NonNullable<ChatMessage['createdAt']>),
    }));
    const messages = [
        ...normalizedThread,
        {
            id: `team-frozen-${normalizedThread.length}`,
            sender: 'USER',
            content: options.userMessageContent,
            attachments: options.userAttachments,
            isComplete: true,
            createdAt: new Date(startedAt + normalizedThread.length).toISOString() as NonNullable<
                ChatMessage['createdAt']
            >,
        } satisfies ChatMessage,
    ];

    if (options.assistantContent !== undefined) {
        messages.push({
            id: `team-frozen-${messages.length}`,
            sender: 'AGENT',
            content: options.assistantContent,
            isComplete: true,
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    } else if (options.includeAssistantPlaceholder) {
        messages.push({
            id: `team-frozen-${messages.length}`,
            sender: 'AGENT',
            content: '',
            isComplete: false,
            lifecycleState: 'running',
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    }

    return messages;
}

/**
 * Creates the frozen-chat persistence facade used by stateless internal team-member chats.
 *
 * @private function of POST
 */
export function createTeamMemberFrozenChatPersistence(options: CreateTeamMemberFrozenChatPersistenceOptions) {
    const { currentRequestIdentity } = options;
    const isPersistenceEnabled =
        !options.isPrivateModeEnabled && shouldPersistTeamMemberFrozenChat(currentRequestIdentity);
    let persistedFrozenChatId: string | undefined;

    return {
        /**
         * Persists the initial user message together with a running assistant placeholder.
         */
        async persistPendingPlaceholder(): Promise<void> {
            if (!isPersistenceEnabled || !currentRequestIdentity) {
                return;
            }

            const persistedFrozenChat = await persistFrozenUserChat({
                userId: currentRequestIdentity.userId,
                agentPermanentId: options.agentId,
                source: USER_CHAT_SOURCES.TEAM_MEMBER,
                messages: createFrozenTeamMemberChatMessages({
                    thread: options.thread,
                    userMessageContent: options.message,
                    userAttachments: options.attachments,
                    includeAssistantPlaceholder: true,
                }),
            }).catch((error) => {
                console.error('[user-chat] Failed to persist team-member frozen chat', error);
                return null;
            });

            persistedFrozenChatId = persistedFrozenChat?.id;
        },

        /**
         * Replaces the running placeholder with the completed assistant answer once streaming finishes.
         */
        async persistCompletedMessage(assistantContent: string): Promise<void> {
            if (!isPersistenceEnabled || !currentRequestIdentity) {
                return;
            }

            await persistFrozenUserChat({
                userId: currentRequestIdentity.userId,
                agentPermanentId: options.agentId,
                source: USER_CHAT_SOURCES.TEAM_MEMBER,
                chatId: persistedFrozenChatId,
                messages: createFrozenTeamMemberChatMessages({
                    thread: options.thread,
                    userMessageContent: options.message,
                    userAttachments: options.attachments,
                    assistantContent,
                }),
            }).catch((error) => {
                console.error('[user-chat] Failed to refresh team-member frozen chat', error);
            });
        },
    };
}
