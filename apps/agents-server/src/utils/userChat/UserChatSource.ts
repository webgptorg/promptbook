/**
 * Canonical origin values for persisted user-chat records.
 */
export const USER_CHAT_SOURCES = {
    WEB_UI: 'WEB_UI',
    OPENAI_API: 'OPENAI_API',
    TEAM_MEMBER: 'TEAM_MEMBER',
} as const;

/**
 * Origin value stored for one persisted user chat.
 */
export type UserChatSource = (typeof USER_CHAT_SOURCES)[keyof typeof USER_CHAT_SOURCES];

/**
 * Returns true when the chat should stay frozen in the web UI.
 */
export function isFrozenUserChatSource(source: UserChatSource): boolean {
    return source !== USER_CHAT_SOURCES.WEB_UI;
}

/**
 * Resolves a compact chip label for one chat source.
 */
export function getUserChatSourceChipLabel(source: UserChatSource): string | null {
    if (source === USER_CHAT_SOURCES.OPENAI_API) {
        return 'API';
    }

    if (source === USER_CHAT_SOURCES.TEAM_MEMBER) {
        return 'TEAM';
    }

    return null;
}

/**
 * Resolves the banner copy used for frozen external chats.
 */
export function getUserChatSourceBannerLabel(source: UserChatSource): string | null {
    if (source === USER_CHAT_SOURCES.OPENAI_API) {
        return 'API key';
    }

    if (source === USER_CHAT_SOURCES.TEAM_MEMBER) {
        return 'team member';
    }

    return null;
}
