/**
 * UserData key used for persisted mocked chats.
 */
export const MOCKED_CHATS_USER_DATA_KEY = 'mockedChats.v1';

/**
 * `UserData.key` prefix used for publicly shareable mocked-chat records.
 */
export const MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX = 'mockedChats.public.v1.';

/**
 * Current schema version for mocked-chat persisted payload.
 */
export const MOCKED_CHATS_SCHEMA_VERSION = 1 as const;

/**
 * Maximum number of mocked chats one user can persist.
 */
export const MAX_MOCKED_CHATS_PER_USER = 100;

/**
 * Maximum number of participants in one mocked chat preset.
 */
export const MAX_MOCKED_CHAT_PARTICIPANTS = 16;

/**
 * Maximum number of messages in one mocked chat preset.
 */
export const MAX_MOCKED_CHAT_MESSAGES = 500;

/**
 * Maximum stored length for chat/preset names.
 */
export const MAX_MOCKED_CHAT_NAME_LENGTH = 120;

/**
 * Maximum stored length for participant display names.
 */
export const MAX_MOCKED_CHAT_PARTICIPANT_NAME_LENGTH = 80;

/**
 * Maximum stored length for one message content.
 */
export const MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH = 4_000;

/**
 * Maximum stored length for avatar/background URLs.
 */
export const MAX_MOCKED_CHAT_URL_LENGTH = 2_048;

/**
 * Fallback delay between generated default messages.
 */
export const DEFAULT_MESSAGE_OFFSET_STEP_MS = 1_200;

/**
 * Regex used for validating participant and message ids.
 */
export const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

/**
 * Regex used for validating plain CSS colors.
 */
export const SAFE_CSS_COLOR_PATTERN = /^(?:#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]{3,24})$/u;

/**
 * Regex used for validating persisted image URLs.
 */
export const SAFE_IMAGE_URL_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/iu;
