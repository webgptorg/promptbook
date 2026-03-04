/**
 * Prompt-parameter key used to forward the active user-chat id from browser chat UI
 * to the server-side `/api/chat` streaming handler.
 *
 * @private Internal helper for Agents Server chat synchronization.
 */
export const USER_CHAT_ID_PROMPT_PARAMETER = '__promptbook_user_chat_id';

/**
 * Parses and removes synchronization-only prompt parameters.
 *
 * @param rawParameters - Unknown prompt parameter payload received from the browser.
 * @returns Extracted chat id (when present) and cleaned parameter map for model execution.
 * @private Internal helper for Agents Server chat synchronization.
 */
export function extractUserChatSynchronizationPayload(rawParameters: unknown): {
    userChatId: string | undefined;
    cleanedParameters: Record<string, unknown>;
} {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        return {
            userChatId: undefined,
            cleanedParameters: {},
        };
    }

    const parameterEntries = Object.entries(rawParameters as Record<string, unknown>).filter(
        ([key]) => key !== USER_CHAT_ID_PROMPT_PARAMETER,
    );

    const rawUserChatId = (rawParameters as Record<string, unknown>)[USER_CHAT_ID_PROMPT_PARAMETER];
    const normalizedUserChatId =
        typeof rawUserChatId === 'string' && rawUserChatId.trim().length > 0 ? rawUserChatId.trim() : undefined;

    return {
        userChatId: normalizedUserChatId,
        cleanedParameters: Object.fromEntries(parameterEntries),
    };
}

/**
 * Adds the active chat id into outgoing prompt parameters.
 *
 * @param baseParameters - Existing prompt parameters used by chat tools.
 * @param userChatId - Active chat id to synchronize, when available.
 * @returns Parameter map enriched with synchronization metadata.
 * @private Internal helper for Agents Server chat synchronization.
 */
export function withUserChatSynchronizationParameter(
    baseParameters: Record<string, unknown>,
    userChatId?: string,
): Record<string, unknown> {
    if (!userChatId) {
        return { ...baseParameters };
    }

    return {
        ...baseParameters,
        [USER_CHAT_ID_PROMPT_PARAMETER]: userChatId,
    };
}
