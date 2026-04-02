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
const MAX_MOCKED_CHATS_PER_USER = 100;

/**
 * Maximum number of participants in one mocked chat preset.
 */
const MAX_MOCKED_CHAT_PARTICIPANTS = 16;

/**
 * Maximum number of messages in one mocked chat preset.
 */
const MAX_MOCKED_CHAT_MESSAGES = 500;

/**
 * Maximum stored length for chat/preset names.
 */
const MAX_MOCKED_CHAT_NAME_LENGTH = 120;

/**
 * Maximum stored length for participant display names.
 */
const MAX_MOCKED_CHAT_PARTICIPANT_NAME_LENGTH = 80;

/**
 * Maximum stored length for one message content.
 */
const MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH = 4_000;

/**
 * Maximum stored length for avatar/background URLs.
 */
const MAX_MOCKED_CHAT_URL_LENGTH = 2_048;

/**
 * Fallback delay between generated default messages.
 */
const DEFAULT_MESSAGE_OFFSET_STEP_MS = 1_200;

/**
 * Regex used for validating participant and message ids.
 */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

/**
 * Regex used for validating plain CSS colors.
 */
const SAFE_CSS_COLOR_PATTERN =
    /^(?:#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]{3,24})$/u;

/**
 * Regex used for validating persisted image URLs.
 */
const SAFE_IMAGE_URL_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/iu;

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

/**
 * Viewport dimensions used by recording-oriented viewer mode.
 */
export const MOCKED_CHAT_VIEWPORT_PRESETS: Record<MockedChatViewportPreset, MockedChatViewportPresetMetadata> = {
    PHONE_PORTRAIT: {
        label: 'Phone portrait (390 x 844)',
        width: 390,
        height: 844,
    },
    TABLET_LANDSCAPE: {
        label: 'Tablet landscape (1024 x 768)',
        width: 1024,
        height: 768,
    },
    LAPTOP: {
        label: 'Laptop (1366 x 768)',
        width: 1366,
        height: 768,
    },
    FULL_HD: {
        label: 'Full HD (1920 x 1080)',
        width: 1920,
        height: 1080,
    },
};

/**
 * Timing multipliers used to derive playback offsets from stored offsets.
 */
export const MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS: Record<MockedChatTimingPreset, number> = {
    FAST: 0.6,
    NORMAL: 1,
    SLOW: 1.6,
};

/**
 * Creates one new stable mocked-chat id.
 */
export function createMockedChatId(): string {
    return createMockedChatEntityId('mocked-chat');
}

/**
 * Builds one `UserData.key` used for looking up a public mocked chat by id.
 */
export function createMockedChatPublicUserDataKey(mockedChatId: string): string {
    return `${MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX}${mockedChatId}`;
}

/**
 * Creates one new stable participant id.
 */
export function createMockedChatParticipantId(): string {
    return createMockedChatEntityId('participant');
}

/**
 * Creates one new stable scripted message id.
 */
export function createMockedChatMessageId(): string {
    return createMockedChatEntityId('message');
}

/**
 * Creates a default mocked-chat preset used by the editor when no data exists.
 */
export function createDefaultMockedChatPreset(): MockedChatPreset {
    const nowIso = new Date().toISOString();
    const userId = 'USER';
    const assistantId = 'ASSISTANT';

    return {
        id: createMockedChatId(),
        name: 'My mocked chat',
        createdAt: nowIso,
        updatedAt: nowIso,
        participants: [
            {
                id: userId,
                name: 'You',
                isMe: true,
                bubbleColor: '#0f766e',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
            {
                id: assistantId,
                name: 'Assistant',
                isMe: false,
                bubbleColor: '#2563eb',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
        ],
        messages: [
            {
                id: createMockedChatMessageId(),
                senderId: userId,
                content: 'Can you summarize this project status for stakeholders?',
                offsetMs: 0,
            },
            {
                id: createMockedChatMessageId(),
                senderId: assistantId,
                content: 'Absolutely. I can draft a short executive summary and a technical appendix.',
                offsetMs: 1_200,
            },
            {
                id: createMockedChatMessageId(),
                senderId: userId,
                content: 'Great, keep it concise and focused on risks and next milestones.',
                offsetMs: 3_200,
            },
            {
                id: createMockedChatMessageId(),
                senderId: assistantId,
                content: 'Understood. I will highlight delivery risk, mitigation plan, and upcoming release checkpoints.',
                offsetMs: 5_000,
            },
        ],
        settings: {
            timingPreset: 'NORMAL',
            loopPlayback: false,
            viewportPreset: 'LAPTOP',
            showTimestamps: true,
            backgroundColor: '#f8fafc',
            backgroundImageUrl: null,
        },
    };
}

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

/**
 * Normalizes a list of presets while preserving deterministic ordering by update date.
 */
export function normalizeMockedChats(value: unknown): Array<MockedChatPreset> {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized = value
        .slice(0, MAX_MOCKED_CHATS_PER_USER)
        .map((item) => normalizeMockedChatPreset(item))
        .filter((item): item is MockedChatPreset => item !== null);

    return normalized.sort((leftPreset, rightPreset) => {
        const leftTimestamp = Date.parse(leftPreset.updatedAt);
        const rightTimestamp = Date.parse(rightPreset.updatedAt);
        return rightTimestamp - leftTimestamp;
    });
}

/**
 * Normalizes one unknown preset payload.
 */
export function normalizeMockedChatPreset(value: unknown): MockedChatPreset | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        id?: unknown;
        name?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
        participants?: unknown;
        messages?: unknown;
        settings?: unknown;
    };

    const nowIso = new Date().toISOString();
    const id = normalizeEntityId(candidate.id, createMockedChatId());
    const name = normalizeText(candidate.name, 'Untitled mocked chat', MAX_MOCKED_CHAT_NAME_LENGTH);
    const createdAt = normalizeIsoDateString(candidate.createdAt, nowIso);
    const updatedAt = normalizeIsoDateString(candidate.updatedAt, nowIso);
    const participants = normalizeMockedChatParticipants(candidate.participants);
    const messages = normalizeMockedChatMessages(candidate.messages, participants);
    const settings = normalizeMockedChatSettings(candidate.settings);

    return {
        id,
        name,
        createdAt,
        updatedAt,
        participants,
        messages,
        settings,
    };
}

/**
 * Creates the default store record used when a user has no mocked chats persisted yet.
 */
export function createDefaultMockedChatStoreRecord(): MockedChatStoreRecord {
    return {
        version: MOCKED_CHATS_SCHEMA_VERSION,
        mockedChats: [createDefaultMockedChatPreset()],
    };
}

/**
 * Normalizes unknown participants into valid participant records.
 */
function normalizeMockedChatParticipants(value: unknown): Array<MockedChatParticipant> {
    if (!Array.isArray(value) || value.length === 0) {
        return createDefaultMockedChatPreset().participants;
    }

    const normalizedParticipants = value
        .slice(0, MAX_MOCKED_CHAT_PARTICIPANTS)
        .map((item, index) => normalizeMockedChatParticipant(item, index))
        .filter((item): item is MockedChatParticipant => item !== null);

    if (normalizedParticipants.length === 0) {
        return createDefaultMockedChatPreset().participants;
    }

    const usedIds = new Set<string>();
    const uniqueParticipants = normalizedParticipants.map((participant) => {
        let nextId = participant.id;
        let duplicateCounter = 2;

        while (usedIds.has(nextId)) {
            nextId = `${participant.id}_${duplicateCounter}`;
            duplicateCounter += 1;
        }

        usedIds.add(nextId);
        return {
            ...participant,
            id: nextId,
        };
    });

    if (!uniqueParticipants.some((participant) => participant.isMe)) {
        uniqueParticipants[0] = {
            ...uniqueParticipants[0],
            isMe: true,
        };
    }

    return uniqueParticipants;
}

/**
 * Normalizes one unknown participant payload.
 */
function normalizeMockedChatParticipant(value: unknown, index: number): MockedChatParticipant | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        id?: unknown;
        name?: unknown;
        fullname?: unknown;
        isMe?: unknown;
        bubbleColor?: unknown;
        color?: unknown;
        avatarUrl?: unknown;
        avatarSrc?: unknown;
        typingAvatarUrl?: unknown;
    };

    const normalizedName = normalizeText(
        candidate.name ?? candidate.fullname,
        `Participant ${index + 1}`,
        MAX_MOCKED_CHAT_PARTICIPANT_NAME_LENGTH,
    );
    const normalizedId = normalizeEntityId(candidate.id ?? normalizedName, createMockedChatParticipantId());

    return {
        id: normalizedId,
        name: normalizedName,
        isMe: Boolean(candidate.isMe),
        bubbleColor: normalizeCssColor(candidate.bubbleColor ?? candidate.color, '#2563eb'),
        avatarUrl: normalizeImageUrl(candidate.avatarUrl ?? candidate.avatarSrc),
        typingAvatarUrl: normalizeImageUrl(candidate.typingAvatarUrl),
    };
}

/**
 * Normalizes unknown scripted messages into safe deterministic messages.
 */
function normalizeMockedChatMessages(
    value: unknown,
    participants: ReadonlyArray<MockedChatParticipant>,
): Array<MockedChatScriptedMessage> {
    if (!Array.isArray(value) || value.length === 0) {
        return createDefaultMessagesForParticipants(participants);
    }

    const validParticipantIds = new Set(participants.map((participant) => participant.id));
    const fallbackSenderId = participants.find((participant) => participant.isMe)?.id || participants[0]?.id || 'USER';

    let lastOffset = 0;
    const normalizedMessages = value
        .slice(0, MAX_MOCKED_CHAT_MESSAGES)
        .map((item) => {
            const message = normalizeMockedChatMessage(item, validParticipantIds, fallbackSenderId, lastOffset);
            if (!message) {
                return null;
            }

            lastOffset = message.offsetMs;
            return message;
        })
        .filter((item): item is MockedChatScriptedMessage => item !== null);

    if (normalizedMessages.length === 0) {
        return createDefaultMessagesForParticipants(participants);
    }

    return normalizedMessages;
}

/**
 * Normalizes one unknown scripted message payload.
 */
function normalizeMockedChatMessage(
    value: unknown,
    validParticipantIds: ReadonlySet<string>,
    fallbackSenderId: string,
    previousOffset: number,
): MockedChatScriptedMessage | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        id?: unknown;
        senderId?: unknown;
        sender?: unknown;
        participantId?: unknown;
        content?: unknown;
        offsetMs?: unknown;
        timestampOffsetMs?: unknown;
    };

    const content = normalizeMessageContent(candidate.content, MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH);
    if (!content) {
        return null;
    }

    const senderCandidate = normalizeEntityId(
        candidate.senderId ?? candidate.participantId ?? candidate.sender,
        fallbackSenderId,
    );
    const senderId = validParticipantIds.has(senderCandidate) ? senderCandidate : fallbackSenderId;
    const rawOffset = Number(candidate.offsetMs ?? candidate.timestampOffsetMs);
    const normalizedOffset = Number.isFinite(rawOffset)
        ? Math.max(previousOffset, Math.max(0, Math.round(rawOffset)))
        : previousOffset + DEFAULT_MESSAGE_OFFSET_STEP_MS;

    return {
        id: normalizeEntityId(candidate.id, createMockedChatMessageId()),
        senderId,
        content,
        offsetMs: normalizedOffset,
    };
}

/**
 * Normalizes unknown settings payload into strict mocked-chat settings.
 */
function normalizeMockedChatSettings(value: unknown): MockedChatSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return createDefaultMockedChatPreset().settings;
    }

    const candidate = value as {
        timingPreset?: unknown;
        loopPlayback?: unknown;
        viewportPreset?: unknown;
        showTimestamps?: unknown;
        backgroundColor?: unknown;
        backgroundImageUrl?: unknown;
    };

    return {
        timingPreset: normalizeTimingPreset(candidate.timingPreset),
        loopPlayback: Boolean(candidate.loopPlayback),
        viewportPreset: normalizeViewportPreset(candidate.viewportPreset),
        showTimestamps: candidate.showTimestamps === false ? false : true,
        backgroundColor: normalizeNullableCssColor(candidate.backgroundColor),
        backgroundImageUrl: normalizeImageUrl(candidate.backgroundImageUrl),
    };
}

/**
 * Creates deterministic starter messages for fallback/default participant sets.
 */
function createDefaultMessagesForParticipants(
    participants: ReadonlyArray<MockedChatParticipant>,
): Array<MockedChatScriptedMessage> {
    const userParticipant = participants.find((participant) => participant.isMe) || participants[0];
    const assistantParticipant = participants.find((participant) => participant.id !== userParticipant?.id) || participants[0];

    if (!userParticipant || !assistantParticipant) {
        return [];
    }

    return [
        {
            id: createMockedChatMessageId(),
            senderId: userParticipant.id,
            content: 'Hello, this is a mocked conversation.',
            offsetMs: 0,
        },
        {
            id: createMockedChatMessageId(),
            senderId: assistantParticipant.id,
            content: 'Hi. The scripted playback is ready for recording.',
            offsetMs: 1_200,
        },
    ];
}

/**
 * Normalizes a string-like id into a safe entity id.
 */
function normalizeEntityId(value: unknown, fallback: string): string {
    const trimmedValue = typeof value === 'string' ? value.trim() : '';
    if (SAFE_ID_PATTERN.test(trimmedValue)) {
        return trimmedValue;
    }

    const slugifiedValue = trimmedValue
        .replace(/[^A-Za-z0-9_-]+/gu, '_')
        .replace(/^_+|_+$/gu, '')
        .slice(0, 64);

    if (slugifiedValue && SAFE_ID_PATTERN.test(slugifiedValue)) {
        return slugifiedValue;
    }

    return fallback;
}

/**
 * Normalizes unknown text value to trimmed text with bounded length.
 */
function normalizeText(value: unknown, fallback: string, maxLength: number): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.replace(/\s+/gu, ' ').trim();
    if (!normalized) {
        return fallback;
    }

    return normalized.slice(0, maxLength);
}

/**
 * Normalizes message content while preserving intentional internal whitespace.
 */
function normalizeMessageContent(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') {
        return '';
    }

    const normalized = value.trim();
    if (!normalized) {
        return '';
    }

    return normalized.slice(0, maxLength);
}

/**
 * Normalizes one unknown CSS color input.
 */
function normalizeCssColor(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) {
        return fallback;
    }

    return SAFE_CSS_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

/**
 * Normalizes one nullable CSS color input.
 */
function normalizeNullableCssColor(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    return SAFE_CSS_COLOR_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Normalizes unknown image URL input.
 */
function normalizeImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_MOCKED_CHAT_URL_LENGTH) {
        return null;
    }

    return SAFE_IMAGE_URL_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Normalizes unknown value into an ISO date string.
 */
function normalizeIsoDateString(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return fallback;
    }

    return new Date(timestamp).toISOString();
}

/**
 * Normalizes unknown timing preset input.
 */
function normalizeTimingPreset(value: unknown): MockedChatTimingPreset {
    if (value === 'FAST' || value === 'SLOW' || value === 'NORMAL') {
        return value;
    }

    return 'NORMAL';
}

/**
 * Normalizes unknown viewport preset input.
 */
function normalizeViewportPreset(value: unknown): MockedChatViewportPreset {
    if (value === 'PHONE_PORTRAIT' || value === 'TABLET_LANDSCAPE' || value === 'LAPTOP' || value === 'FULL_HD') {
        return value;
    }

    return 'LAPTOP';
}

/**
 * Creates one deterministic id string for mocked-chat entities.
 */
function createMockedChatEntityId(prefix: string): string {
    const randomPart = Math.floor(Math.random() * 1_000_000)
        .toString(36)
        .padStart(4, '0');
    return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}
