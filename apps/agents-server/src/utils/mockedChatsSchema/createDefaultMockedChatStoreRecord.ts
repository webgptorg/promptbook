import type { MockedChatStoreRecord } from './MockedChatPreset';
import { MOCKED_CHATS_SCHEMA_VERSION } from './MOCKED_CHATS_USER_DATA_KEY';
import { createDefaultMockedChatPreset } from './createDefaultMockedChatPreset';

/**
 * Creates the default store record used when a user has no mocked chats persisted yet.
 */
export function createDefaultMockedChatStoreRecord(): MockedChatStoreRecord {
    return {
        version: MOCKED_CHATS_SCHEMA_VERSION,
        mockedChats: [createDefaultMockedChatPreset()],
    };
}
