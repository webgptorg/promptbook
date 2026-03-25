import { getUserDataValue, upsertUserDataValue } from './userData';
import {
    MOCKED_CHATS_USER_DATA_KEY,
    MOCKED_CHATS_SCHEMA_VERSION,
    normalizeMockedChatStoreRecord,
    type MockedChatPreset,
    type MockedChatStoreRecord,
} from './mockedChatsSchema';

/**
 * Loads mocked-chat presets for one user from `UserData`.
 */
export async function getMockedChatStoreRecordForUser(userId: number): Promise<MockedChatStoreRecord> {
    const storedValue = await getUserDataValue({
        userId,
        key: MOCKED_CHATS_USER_DATA_KEY,
    });

    if (!storedValue) {
        return {
            version: MOCKED_CHATS_SCHEMA_VERSION,
            mockedChats: [],
        };
    }

    return normalizeMockedChatStoreRecord(storedValue);
}

/**
 * Persists mocked-chat presets for one user after normalization.
 */
export async function saveMockedChatStoreRecordForUser(
    userId: number,
    value: unknown,
): Promise<MockedChatStoreRecord> {
    const normalizedRecord = normalizeMockedChatStoreRecord(value);

    await upsertUserDataValue({
        userId,
        key: MOCKED_CHATS_USER_DATA_KEY,
        value: normalizedRecord,
    });

    return normalizedRecord;
}

/**
 * Loads mocked-chat presets as a plain array.
 */
export async function getMockedChatsForUser(userId: number): Promise<Array<MockedChatPreset>> {
    const storeRecord = await getMockedChatStoreRecordForUser(userId);
    return storeRecord.mockedChats;
}

/**
 * Persists mocked-chat presets from an unknown payload and returns normalized presets.
 */
export async function saveMockedChatsForUser(userId: number, mockedChats: unknown): Promise<Array<MockedChatPreset>> {
    const storeRecord = await saveMockedChatStoreRecordForUser(userId, {
        version: MOCKED_CHATS_SCHEMA_VERSION,
        mockedChats,
    });

    return storeRecord.mockedChats;
}
