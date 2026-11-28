import { persistFrozenUserChat, USER_CHAT_SOURCES } from '@/src/utils/userChat';
import type { ChatMessage } from '@promptbook-local/types';

/**
 * Best-effort OpenAI-compatible message shape used for frozen audit snapshots.
 */
type OpenAiCompatibilityMessageLike = {
    role?: unknown;
    content?: unknown;
};

/**
 * Persists one OpenAI-compatible frozen chat snapshot when the current request should store it.
 *
 * @private function of `handleChatCompletion`
 */
export async function persistOpenAiCompatibilityFrozenChat(options: {
    isEnabled: boolean;
    userId: number | null | undefined;
    agentId: string;
    messages: ReadonlyArray<unknown>;
    chatId?: string;
    assistantContent?: string;
    includeAssistantPlaceholder?: boolean;
    failureMessage: string;
}): Promise<string | undefined> {
    const { isEnabled, userId, agentId, messages, chatId, assistantContent, includeAssistantPlaceholder, failureMessage } =
        options;
    if (!isEnabled || !userId) {
        return undefined;
    }

    const persistedFrozenChat = await persistFrozenUserChat({
        userId,
        agentPermanentId: agentId,
        source: USER_CHAT_SOURCES.OPENAI_API,
        chatId,
        messages: createFrozenOpenAiCompatibilityMessages(messages, assistantContent, {
            includeAssistantPlaceholder,
        }),
    }).catch((error) => {
        console.error(failureMessage, error);
        return null;
    });

    return persistedFrozenChat?.id;
}

/**
 * Converts arbitrary OpenAI-compatible message content into plain text for frozen chat replay.
 */
function normalizeOpenAiCompatibilityMessageContent(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map((part) => {
                if (typeof part === 'string') {
                    return part;
                }

                if (!part || typeof part !== 'object') {
                    return '';
                }

                const partLike = part as { type?: unknown; text?: unknown; image_url?: unknown };
                if (typeof partLike.text === 'string') {
                    return partLike.text;
                }

                if (typeof partLike.type === 'string' && partLike.type.toLowerCase().includes('image')) {
                    return '[Image input]';
                }

                if (partLike.image_url) {
                    return '[Image input]';
                }

                return '';
            })
            .filter(Boolean)
            .join('\n');
    }

    if (value === null || value === undefined) {
        return '';
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

/**
 * Maps OpenAI-compatible roles to Promptbook chat senders for frozen chat replay.
 */
function mapOpenAiCompatibilityRoleToSender(role: unknown): ChatMessage['sender'] {
    if (typeof role !== 'string') {
        return 'USER';
    }

    switch (role) {
        case 'assistant':
            return 'AGENT';
        case 'system':
            return 'SYSTEM';
        case 'tool':
            return 'TOOL';
        case 'developer':
            return 'SYSTEM';
        default:
            return 'USER';
    }
}

/**
 * Creates a frozen chat transcript from one OpenAI-compatible request snapshot.
 */
function createFrozenOpenAiCompatibilityMessages(
    rawMessages: ReadonlyArray<unknown>,
    assistantContent?: string,
    options: {
        includeAssistantPlaceholder?: boolean;
    } = {},
): Array<ChatMessage> {
    const startedAt = Date.now();
    const messages: Array<ChatMessage> = rawMessages.map((rawMessage, index) => {
        const message = rawMessage as OpenAiCompatibilityMessageLike;

        return {
            id: `openai-frozen-${index}`,
            sender: mapOpenAiCompatibilityRoleToSender(message.role),
            content: normalizeOpenAiCompatibilityMessageContent(message.content),
            isComplete: true,
            createdAt: new Date(startedAt + index).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage;
    });

    if (assistantContent !== undefined) {
        messages.push({
            id: `openai-frozen-${messages.length}`,
            sender: 'AGENT',
            content: assistantContent,
            isComplete: true,
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    } else if (options.includeAssistantPlaceholder) {
        messages.push({
            id: `openai-frozen-${messages.length}`,
            sender: 'AGENT',
            content: '',
            isComplete: false,
            lifecycleState: 'running',
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    }

    return messages;
}
