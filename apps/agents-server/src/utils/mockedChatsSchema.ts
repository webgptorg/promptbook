export {
    DEFAULT_MESSAGE_OFFSET_STEP_MS,
    MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH,
    MAX_MOCKED_CHAT_MESSAGES,
    MAX_MOCKED_CHAT_NAME_LENGTH,
    MAX_MOCKED_CHAT_PARTICIPANTS,
    MAX_MOCKED_CHAT_PARTICIPANT_NAME_LENGTH,
    MAX_MOCKED_CHAT_URL_LENGTH,
    MAX_MOCKED_CHATS_PER_USER,
    MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX,
    MOCKED_CHATS_SCHEMA_VERSION,
    MOCKED_CHATS_USER_DATA_KEY,
    SAFE_CSS_COLOR_PATTERN,
    SAFE_ID_PATTERN,
    SAFE_IMAGE_URL_PATTERN,
} from './mockedChatsSchema/MOCKED_CHATS_USER_DATA_KEY';
export { MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS } from './mockedChatsSchema/MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS';
export { MOCKED_CHAT_VIEWPORT_PRESETS } from './mockedChatsSchema/MOCKED_CHAT_VIEWPORT_PRESETS';
export { createDefaultMockedChatPreset } from './mockedChatsSchema/createDefaultMockedChatPreset';
export { createDefaultMockedChatStoreRecord } from './mockedChatsSchema/createDefaultMockedChatStoreRecord';
export {
    createMockedChatId,
    createMockedChatMessageId,
    createMockedChatParticipantId,
} from './mockedChatsSchema/createMockedChatId';
export { createMockedChatPublicUserDataKey } from './mockedChatsSchema/createMockedChatPublicUserDataKey';
export { normalizeMockedChatPreset } from './mockedChatsSchema/normalizeMockedChatPreset';
export { normalizeMockedChats } from './mockedChatsSchema/normalizeMockedChats';
export { normalizeMockedChatStoreRecord } from './mockedChatsSchema/normalizeMockedChatStoreRecord';
export type {
    MockedChatParticipant,
    MockedChatPreset,
    MockedChatScriptedMessage,
    MockedChatSettings,
    MockedChatStoreRecord,
    MockedChatTimingPreset,
    MockedChatViewportPreset,
    MockedChatViewportPresetMetadata,
} from './mockedChatsSchema/MockedChatPreset';
