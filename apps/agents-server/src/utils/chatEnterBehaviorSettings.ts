import { deleteUserDataByKeysForUser, getUserDataValue, upsertUserDataValue } from './userData';
import {
    isAgentsServerChatEnterBehavior,
    type AgentsServerChatEnterBehavior,
} from './chatEnterBehavior';

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
export {
    invertAgentsServerChatEnterBehavior,
    isAgentsServerChatEnterBehavior,
    type AgentsServerChatEnterBehavior,
} from './chatEnterBehavior';

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

/**
 * Clears the stored chat Enter behavior preference for the provided user id.
 */
export async function clearChatEnterBehaviorSettingsForUser(userId: number): Promise<void> {
    await deleteUserDataByKeysForUser({
        userId,
        keys: [CHAT_ENTER_BEHAVIOR_SETTINGS_USER_DATA_KEY],
    });
}

/**
 * Persists or clears one chat Enter behavior preference for the provided user id.
 */
export async function updateChatEnterBehaviorSettingsForUser(
    userId: number,
    enterBehavior: AgentsServerChatEnterBehavior | null,
): Promise<ChatEnterBehaviorSettingsSnapshot> {
    if (enterBehavior === null) {
        await clearChatEnterBehaviorSettingsForUser(userId);
        return { enterBehavior: null };
    }

    const record = await setChatEnterBehaviorSettingsForUser(userId, enterBehavior);
    return { enterBehavior: record.enterBehavior };
}
