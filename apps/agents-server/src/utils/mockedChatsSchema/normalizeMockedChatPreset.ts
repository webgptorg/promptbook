import type {
    MockedChatParticipant,
    MockedChatPreset,
    MockedChatScriptedMessage,
    MockedChatSettings,
    MockedChatTimingPreset,
    MockedChatViewportPreset,
} from './MockedChatPreset';
import {
    DEFAULT_MESSAGE_OFFSET_STEP_MS,
    MAX_MOCKED_CHAT_MESSAGES,
    MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH,
    MAX_MOCKED_CHAT_NAME_LENGTH,
    MAX_MOCKED_CHAT_PARTICIPANTS,
    MAX_MOCKED_CHAT_PARTICIPANT_NAME_LENGTH,
    MAX_MOCKED_CHAT_URL_LENGTH,
    SAFE_CSS_COLOR_PATTERN,
    SAFE_ID_PATTERN,
    SAFE_IMAGE_URL_PATTERN,
} from './MOCKED_CHATS_USER_DATA_KEY';
import { createDefaultMockedChatPreset } from './createDefaultMockedChatPreset';
import { createMockedChatId, createMockedChatMessageId, createMockedChatParticipantId } from './createMockedChatId';

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
 * Normalizes unknown participants into valid participant records.
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
 */
function createDefaultMessagesForParticipants(
    participants: ReadonlyArray<MockedChatParticipant>,
): Array<MockedChatScriptedMessage> {
    const userParticipant = participants.find((participant) => participant.isMe) || participants[0];
    const assistantParticipant =
        participants.find((participant) => participant.id !== userParticipant?.id) || participants[0];

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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
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
 *
 * @private function of `normalizeMockedChatPreset`
 */
function normalizeTimingPreset(value: unknown): MockedChatTimingPreset {
    if (value === 'FAST' || value === 'SLOW' || value === 'NORMAL') {
        return value;
    }

    return 'NORMAL';
}

/**
 * Normalizes unknown viewport preset input.
 *
 * @private function of `normalizeMockedChatPreset`
 */
function normalizeViewportPreset(value: unknown): MockedChatViewportPreset {
    if (value === 'PHONE_PORTRAIT' || value === 'TABLET_LANDSCAPE' || value === 'LAPTOP' || value === 'FULL_HD') {
        return value;
    }

    return 'LAPTOP';
}
