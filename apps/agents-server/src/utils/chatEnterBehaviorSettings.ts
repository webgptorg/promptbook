import { getUserDataValue, upsertUserDataValue } from './userData';

/**
 * Supported Enter-key behaviors exposed by the Agents Server UI.
 */
export type AgentsServerChatEnterBehavior = 'SEND' | 'NEWLINE';

/**
 * Stored keybindings payload persisted in `UserData`.
 */
export type ChatEnterBehaviorSettingsRecord = {
    version: 1;
    enterBehavior: AgentsServerChatEnterBehavior;
};

/**
 * Response payload returned by the keybindings settings API.
 */
export type ChatEnterBehaviorSettingsSnapshot = {
    enterBehavior: AgentsServerChatEnterBehavior | null;
};

/**
 * Version marker used by persisted keybinding settings payloads.
 */
const CHAT_ENTER_BEHAVIOR_SETTINGS_VERSION = 1 as const;

/**
 * `UserData.key` used for chat keybinding preferences.
 */
const CHAT_ENTER_BEHAVIOR_SETTINGS_USER_DATA_KEY = 'settings:keybindings';

/**
 * Returns true when the supplied value is one of the supported Enter behaviors.
 */
export function isAgentsServerChatEnterBehavior(value: unknown): value is AgentsServerChatEnterBehavior {
    return value === 'SEND' || value === 'NEWLINE';
}

/**
 * Resolves the inverse action performed by `Ctrl+Enter`.
 */
export function invertAgentsServerChatEnterBehavior(
    enterBehavior: AgentsServerChatEnterBehavior,
): AgentsServerChatEnterBehavior {
    return enterBehavior === 'SEND' ? 'NEWLINE' : 'SEND';
}

/**
 * Validates and normalizes one raw `UserData.value` keybinding payload.
 */
export function normalizeChatEnterBehaviorSettingsRecord(value: unknown): ChatEnterBehaviorSettingsRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        version?: unknown;
        enterBehavior?: unknown;
    };

    if (candidate.version !== CHAT_ENTER_BEHAVIOR_SETTINGS_VERSION) {
        return null;
    }

    if (!isAgentsServerChatEnterBehavior(candidate.enterBehavior)) {
        return null;
    }

    return {
        version: CHAT_ENTER_BEHAVIOR_SETTINGS_VERSION,
        enterBehavior: candidate.enterBehavior,
    };
}

/**
 * Loads chat Enter behavior settings for the provided user id.
 */
export async function getChatEnterBehaviorSettingsForUser(
    userId: number,
): Promise<ChatEnterBehaviorSettingsRecord | null> {
    const storedValue = await getUserDataValue({
        userId,
        key: CHAT_ENTER_BEHAVIOR_SETTINGS_USER_DATA_KEY,
    });

    return normalizeChatEnterBehaviorSettingsRecord(storedValue);
}

/**
 * Persists one chat Enter behavior setting for the provided user id.
 */
export async function setChatEnterBehaviorSettingsForUser(
    userId: number,
    enterBehavior: AgentsServerChatEnterBehavior,
): Promise<ChatEnterBehaviorSettingsRecord> {
    const record: ChatEnterBehaviorSettingsRecord = {
        version: CHAT_ENTER_BEHAVIOR_SETTINGS_VERSION,
        enterBehavior,
    };

    await upsertUserDataValue({
        userId,
        key: CHAT_ENTER_BEHAVIOR_SETTINGS_USER_DATA_KEY,
        value: record,
    });

    return record;
}
