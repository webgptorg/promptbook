import type { MockedChatStoreRecord } from './MockedChatPreset';
import { MOCKED_CHATS_SCHEMA_VERSION } from './MOCKED_CHATS_USER_DATA_KEY';
import { normalizeMockedChats } from './normalizeMockedChats';

/**
 * Normalizes unknown persisted payload into the current mocked-chat store schema.
 */
export function normalizeMockedChatStoreRecord(value: unknown): MockedChatStoreRecord {
    if (Array.isArray(value)) {
        return {
            version: MOCKED_CHATS_SCHEMA_VERSION,
            mockedChats: normalizeMockedChats(value),
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            version: MOCKED_CHATS_SCHEMA_VERSION,
            mockedChats: [],
        };
    }

    const record = value as {
        version?: unknown;
        mockedChats?: unknown;
        chats?: unknown;
    };

    const mockedChatsSource = Array.isArray(record.mockedChats)
        ? record.mockedChats
        : Array.isArray(record.chats)
        ? record.chats
        : [];

    return {
        version: MOCKED_CHATS_SCHEMA_VERSION,
        mockedChats: normalizeMockedChats(mockedChatsSource),
    };
}
