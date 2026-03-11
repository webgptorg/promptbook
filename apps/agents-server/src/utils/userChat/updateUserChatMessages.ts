import type { UpdateUserChatMessagesOptions, UserChatRecord } from './UserChatRecord';
import { mutateUserChat } from './mutateUserChat';
import { normalizeMessagesInput, resolveLastMessageAt } from './resolveLastMessageAt';

/**
 * One persisted chat message entry.
 *
 * @private function of `userChat`
 */
type UserChatMessage = UserChatRecord['messages'][number];

/**
 * Replaces stored chat messages using append-only merge semantics and optimistic retries.
 */
export async function updateUserChatMessages(
    options: UpdateUserChatMessagesOptions,
): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId } = options;
    const incomingMessages = normalizeMessagesInput(options.messages);
    return mutateUserChat({
        userId,
        agentPermanentId,
        chatId,
        mutate: (currentChat) => {
            const mergedMessages = mergeUserChatMessagesAppendOnly(currentChat.messages, incomingMessages);
            const now = new Date().toISOString();

            return {
                messages: mergedMessages,
                lastMessageAt: resolveLastMessageAt(mergedMessages, now),
            };
        },
    });
}

/**
 * Merges incoming messages into stored messages while preserving append-only history.
 *
 * @private function of `userChat`
 */
export function mergeUserChatMessagesAppendOnly(
    storedMessages: ReadonlyArray<UserChatMessage>,
    incomingMessages: ReadonlyArray<UserChatMessage>,
): Array<UserChatMessage> {
    const mergedMessages = [...storedMessages];
    const messageIndexById = new Map<string, number>();
    const idlessMessageSignatures = new Set<string>();

    for (let index = 0; index < mergedMessages.length; index++) {
        const message = mergedMessages[index];
        if (!message) {
            continue;
        }

        const messageId = resolveChatMessageId(message);
        if (messageId) {
            if (!messageIndexById.has(messageId)) {
                messageIndexById.set(messageId, index);
            }
            continue;
        }

        idlessMessageSignatures.add(resolveChatMessageSignature(message));
    }

    for (const incomingMessage of incomingMessages) {
        const incomingMessageId = resolveChatMessageId(incomingMessage);
        if (incomingMessageId) {
            const existingIndex = messageIndexById.get(incomingMessageId);
            if (existingIndex === undefined) {
                messageIndexById.set(incomingMessageId, mergedMessages.length);
                mergedMessages.push(incomingMessage);
                continue;
            }

            const existingMessage = mergedMessages[existingIndex];
            if (!existingMessage) {
                mergedMessages[existingIndex] = incomingMessage;
                continue;
            }

            mergedMessages[existingIndex] = resolvePreferredChatMessage(existingMessage, incomingMessage);
            continue;
        }

        const incomingSignature = resolveChatMessageSignature(incomingMessage);
        if (idlessMessageSignatures.has(incomingSignature)) {
            continue;
        }

        idlessMessageSignatures.add(incomingSignature);
        mergedMessages.push(incomingMessage);
    }

    return mergedMessages;
}

/**
 * Resolves stable message id when available.
 *
 * @private function of `userChat`
 */
function resolveChatMessageId(message: UserChatMessage): string | null {
    return typeof message.id === 'string' && message.id.length > 0 ? message.id : null;
}

/**
 * Builds a deterministic signature for id-less messages.
 *
 * @private function of `userChat`
 */
function resolveChatMessageSignature(message: UserChatMessage): string {
    return JSON.stringify(message);
}

/**
 * Selects the safer message variant for one id when concurrent saves race.
 *
 * @private function of `userChat`
 */
function resolvePreferredChatMessage(
    existingMessage: UserChatMessage,
    incomingMessage: UserChatMessage,
): UserChatMessage {
    const existingScore = resolveChatMessageCompletenessScore(existingMessage);
    const incomingScore = resolveChatMessageCompletenessScore(incomingMessage);

    if (incomingScore > existingScore) {
        return incomingMessage;
    }

    if (incomingScore < existingScore) {
        return existingMessage;
    }

    return incomingMessage;
}

/**
 * Approximates message completeness so finalized variants win over partial ones.
 *
 * @private function of `userChat`
 */
function resolveChatMessageCompletenessScore(message: UserChatMessage): number {
    const contentLength = typeof message.content === 'string' ? message.content.length : 0;
    const completedToolCallsLength = Array.isArray(message.completedToolCalls) ? message.completedToolCalls.length : 0;
    const toolCallsLength = Array.isArray(message.toolCalls) ? message.toolCalls.length : 0;
    const attachmentsLength = Array.isArray(message.attachments) ? message.attachments.length : 0;
    const completionScore = message.isComplete === true ? 10_000 : message.isComplete === false ? -1_000 : 0;

    return completionScore + contentLength + completedToolCallsLength * 100 + toolCallsLength * 10 + attachmentsLength;
}
