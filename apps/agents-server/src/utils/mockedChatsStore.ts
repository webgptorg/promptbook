import {
    deleteUserDataByKeysForUser,
    getAnyUserDataValueByKey,
    getUserDataValue,
    listUserDataKeysByPrefixForUser,
    listUserDataValuesByKey,
    upsertUserDataValue,
} from './userData';
import {
    MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX,
    MOCKED_CHATS_USER_DATA_KEY,
    MOCKED_CHATS_SCHEMA_VERSION,
    createMockedChatPublicUserDataKey,
    normalizeMockedChatPreset,
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

    await synchronizePublicMockedChatsForUser(userId, normalizedRecord.mockedChats);

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

/**
 * Loads one publicly shareable mocked chat by its id.
 */
export async function getPublicMockedChatById(mockedChatId: string): Promise<MockedChatPreset | null> {
    const publicMockedChatKey = createMockedChatPublicUserDataKey(mockedChatId);
    const indexedPublicValue = await getAnyUserDataValueByKey({ key: publicMockedChatKey });
    const indexedPublicMockedChat = normalizeMockedChatPreset(indexedPublicValue);

    if (indexedPublicMockedChat && indexedPublicMockedChat.id === mockedChatId) {
        return indexedPublicMockedChat;
    }

    const fallbackChatRecord = await findMockedChatByIdInUserStores(mockedChatId);
    if (!fallbackChatRecord) {
        return null;
    }

    await upsertUserDataValue({
        userId: fallbackChatRecord.userId,
        key: publicMockedChatKey,
        value: fallbackChatRecord.mockedChat,
    });

    return fallbackChatRecord.mockedChat;
}

/**
 * Internal fallback record used when a public index entry is missing.
 */
type FoundMockedChatInStore = {
    userId: number;
    mockedChat: MockedChatPreset;
};

/**
 * Finds one mocked chat by id by scanning per-user mocked-chat stores.
 */
async function findMockedChatByIdInUserStores(mockedChatId: string): Promise<FoundMockedChatInStore | null> {
    const storeRows = await listUserDataValuesByKey({ key: MOCKED_CHATS_USER_DATA_KEY });

    for (const storeRow of storeRows) {
        const normalizedStoreRecord = normalizeMockedChatStoreRecord(storeRow.value);
        const matchedMockedChat = normalizedStoreRecord.mockedChats.find((mockedChat) => mockedChat.id === mockedChatId);

        if (matchedMockedChat) {
            return {
                userId: storeRow.userId,
                mockedChat: matchedMockedChat,
            };
        }
    }

    return null;
}

/**
 * Synchronizes one user's public mocked-chat index with their latest saved presets.
 */
async function synchronizePublicMockedChatsForUser(userId: number, mockedChats: ReadonlyArray<MockedChatPreset>): Promise<void> {
    const uniqueMockedChatsById = new Map<string, MockedChatPreset>();
    for (const mockedChat of mockedChats) {
        uniqueMockedChatsById.set(mockedChat.id, mockedChat);
    }

    const publicMockedChatKeys = Array.from(uniqueMockedChatsById.keys(), (mockedChatId) =>
        createMockedChatPublicUserDataKey(mockedChatId),
    );

    await Promise.all(
        Array.from(uniqueMockedChatsById.values(), (mockedChat) =>
            upsertUserDataValue({
                userId,
                key: createMockedChatPublicUserDataKey(mockedChat.id),
                value: mockedChat,
            }),
        ),
    );

    const existingPublicMockedChatKeys = await listUserDataKeysByPrefixForUser({
        userId,
        keyPrefix: MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX,
    });
    const expectedPublicMockedChatKeys = new Set(publicMockedChatKeys);
    const stalePublicMockedChatKeys = existingPublicMockedChatKeys.filter((key) => !expectedPublicMockedChatKeys.has(key));

    await deleteUserDataByKeysForUser({
        userId,
        keys: stalePublicMockedChatKeys,
    });
}
