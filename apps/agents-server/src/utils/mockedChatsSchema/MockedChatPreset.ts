import type { MOCKED_CHATS_SCHEMA_VERSION } from './MOCKED_CHATS_USER_DATA_KEY';

/**
 * Allowed playback speed presets.
 */
export type MockedChatTimingPreset = 'FAST' | 'NORMAL' | 'SLOW';

/**
 * Allowed viewport presets used by recording helper UI.
 */
export type MockedChatViewportPreset = 'PHONE_PORTRAIT' | 'TABLET_LANDSCAPE' | 'LAPTOP' | 'FULL_HD';

/**
 * One participant definition used by mocked-chat presets.
 */
export type MockedChatParticipant = {
    id: string;
    name: string;
    isMe: boolean;
    bubbleColor: string;
    avatarUrl: string | null;
    typingAvatarUrl: string | null;
};

/**
 * One scripted message in a mocked chat preset.
 */
export type MockedChatScriptedMessage = {
    id: string;
    senderId: string;
    content: string;
    offsetMs: number;
};

/**
 * Metadata controlling mocked-chat playback and framing.
 */
export type MockedChatSettings = {
    timingPreset: MockedChatTimingPreset;
    loopPlayback: boolean;
    viewportPreset: MockedChatViewportPreset;
    showTimestamps: boolean;
    backgroundColor: string | null;
    backgroundImageUrl: string | null;
};

/**
 * Full mocked-chat preset persisted in UserData.
 */
export type MockedChatPreset = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    participants: Array<MockedChatParticipant>;
    messages: Array<MockedChatScriptedMessage>;
    settings: MockedChatSettings;
};

/**
 * Root persisted payload for mocked chats.
 */
export type MockedChatStoreRecord = {
    version: typeof MOCKED_CHATS_SCHEMA_VERSION;
    mockedChats: Array<MockedChatPreset>;
};

/**
 * Typed viewport metadata used by editor/viewer UI.
 */
export type MockedChatViewportPresetMetadata = {
    label: string;
    width: number;
    height: number;
};
