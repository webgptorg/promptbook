import {
    createMockedChatId,
    createMockedChatMessageId,
    DEFAULT_MESSAGE_OFFSET_STEP_MS,
    MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH,
    MAX_MOCKED_CHAT_MESSAGES,
    MAX_MOCKED_CHAT_NAME_LENGTH,
    type MockedChatPreset,
} from '@/src/utils/mockedChatsSchema';

/**
 * Longest playback gap kept between two recorded messages.
 *
 * Real chats can have hours between messages, replaying that verbatim would freeze the mock.
 *
 * @private constant of `createMockedChatPresetFromChatMessages`
 */
const MAX_MESSAGE_OFFSET_GAP_MS = 8_000;

/**
 * Participant id used for user-authored messages in generated presets.
 *
 * @private constant of `createMockedChatPresetFromChatMessages`
 */
const USER_PARTICIPANT_ID = 'USER';

/**
 * Participant id used for agent-authored messages in generated presets.
 *
 * @private constant of `createMockedChatPresetFromChatMessages`
 */
const ASSISTANT_PARTICIPANT_ID = 'ASSISTANT';

/**
 * One generic source message used to seed a mocked-chat preset.
 */
export type MockedChatSourceMessage = {
    /**
     * Message author; `USER` maps to the "me" participant, anything else to the assistant.
     */
    sender: string;
    /**
     * Plain-text message content.
     */
    content: string;
    /**
     * Optional creation timestamp used to derive playback offsets.
     */
    createdAt?: string | null;
};

/**
 * Builds one mocked-chat preset from recorded chat messages.
 *
 * Shared by the admin chat-history page and the external-chat view so both
 * "Create mock" buttons produce identical presets (DRY).
 */
export function createMockedChatPresetFromChatMessages(options: {
    name: string;
    messages: ReadonlyArray<MockedChatSourceMessage>;
}): MockedChatPreset {
    const nowIso = new Date().toISOString();
    const limitedMessages = options.messages
        .filter((message) => message.content.trim().length > 0)
        .slice(0, MAX_MOCKED_CHAT_MESSAGES);

    return {
        id: createMockedChatId(),
        name: options.name.slice(0, MAX_MOCKED_CHAT_NAME_LENGTH) || 'Recorded chat',
        createdAt: nowIso,
        updatedAt: nowIso,
        participants: [
            {
                id: USER_PARTICIPANT_ID,
                name: 'You',
                isMe: true,
                bubbleColor: '#0f766e',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
            {
                id: ASSISTANT_PARTICIPANT_ID,
                name: 'Assistant',
                isMe: false,
                bubbleColor: '#2563eb',
                avatarUrl: null,
                typingAvatarUrl: null,
            },
        ],
        messages: limitedMessages.map((message, messageIndex) => ({
            id: createMockedChatMessageId(),
            senderId: isUserSender(message.sender) ? USER_PARTICIPANT_ID : ASSISTANT_PARTICIPANT_ID,
            content: message.content.slice(0, MAX_MOCKED_CHAT_MESSAGE_CONTENT_LENGTH),
            offsetMs: resolveMessageOffsetMs(limitedMessages, messageIndex),
        })),
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
 * Checks whether the sender represents the human user.
 *
 * @private function of `createMockedChatPresetFromChatMessages`
 */
function isUserSender(sender: string): boolean {
    return sender.toUpperCase() === 'USER';
}

/**
 * Derives one playback offset from recorded timestamps with a sane maximum gap.
 *
 * @private function of `createMockedChatPresetFromChatMessages`
 */
function resolveMessageOffsetMs(messages: ReadonlyArray<MockedChatSourceMessage>, messageIndex: number): number {
    if (messageIndex === 0) {
        return 0;
    }

    let offsetMs = 0;
    for (let index = 1; index <= messageIndex; index++) {
        const previousTimestamp = Date.parse(messages[index - 1]?.createdAt || '');
        const currentTimestamp = Date.parse(messages[index]?.createdAt || '');
        const gapMs =
            Number.isFinite(previousTimestamp) && Number.isFinite(currentTimestamp)
                ? currentTimestamp - previousTimestamp
                : Number.NaN;

        if (Number.isFinite(gapMs) && gapMs >= 0) {
            offsetMs += Math.min(gapMs, MAX_MESSAGE_OFFSET_GAP_MS);
        } else {
            offsetMs += DEFAULT_MESSAGE_OFFSET_STEP_MS;
        }
    }

    return offsetMs;
}
