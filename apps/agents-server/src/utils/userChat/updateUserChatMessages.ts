import { Json } from '@/src/database/schema';
import type { UpdateUserChatMessagesOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { createMissingUserChatScopeError } from './createMissingUserChatScopeError';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { normalizeMessagesInput, resolveLastMessageAt } from './resolveLastMessageAt';

/**
 * Maximum number of optimistic retries when concurrent updates race.
 *
 * @private function of `userChat`
 */
const UPDATE_USER_CHAT_MAX_ATTEMPTS = 5;

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
    const userChatTable = await provideUserChatTable();

    for (let attempt = 0; attempt < UPDATE_USER_CHAT_MAX_ATTEMPTS; attempt++) {
        const { data: currentData, error: currentError } = await userChatTable
            .select('*')
            .eq('id', chatId)
            .eq('userId', userId)
            .eq('agentPermanentId', agentPermanentId)
            .maybeSingle();

        if (currentError) {
            throw new Error(`Failed to load user chat "${chatId}" before update: ${currentError.message}`);
        }

        if (!currentData) {
            throw await createMissingUserChatScopeError(userChatTable, {
                operation: 'update_messages',
                userId,
                agentPermanentId,
                chatId,
            });
        }

        const currentChat = mapUserChatRow(currentData as UserChatRow);
        const mergedMessages = mergeUserChatMessagesAppendOnly(currentChat.messages, incomingMessages);
        const now = new Date().toISOString();

        const { data: updatedData, error: updateError } = await userChatTable
            .update({
                updatedAt: now,
                lastMessageAt: resolveLastMessageAt(mergedMessages, now),
                messages: mergedMessages as unknown as Json,
            })
            .eq('id', chatId)
            .eq('userId', userId)
            .eq('agentPermanentId', agentPermanentId)
            .eq('updatedAt', currentChat.updatedAt)
            .select('*')
            .maybeSingle();

        if (updateError) {
            throw new Error(`Failed to update user chat "${chatId}": ${updateError.message}`);
        }

        if (updatedData) {
            return mapUserChatRow(updatedData as UserChatRow);
        }
    }

    throw new Error(`Failed to update user chat "${chatId}" due to concurrent updates.`);
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
