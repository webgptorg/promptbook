import {
    createMockedChatMessageId,
    type MockedChatParticipant,
    type MockedChatPreset,
    type MockedChatScriptedMessage,
} from '@/src/utils/mockedChatsSchema';

/**
 * Fallback offset distance when adding new scripted messages.
 *
 * @private constant of <MockedChatsEditorClient/>
 */
const DEFAULT_NEW_MESSAGE_OFFSET_STEP_MS = 1_200;

/**
 * Adds one scripted message at the end of the sequence.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithAddedMessage(previousDraft: MockedChatPreset): MockedChatPreset {
    const previousOffset = previousDraft.messages[previousDraft.messages.length - 1]?.offsetMs || 0;

    const nextMessage: MockedChatScriptedMessage = {
        id: createMockedChatMessageId(),
        senderId: resolveDefaultMessageSenderId(previousDraft.participants),
        content: 'New scripted message',
        offsetMs: previousOffset + DEFAULT_NEW_MESSAGE_OFFSET_STEP_MS,
    };

    return {
        ...previousDraft,
        messages: [...previousDraft.messages, nextMessage],
    };
}

/**
 * Updates one scripted message field.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithUpdatedMessage<TField extends keyof MockedChatScriptedMessage>(
    previousDraft: MockedChatPreset,
    messageId: string,
    field: TField,
    value: MockedChatScriptedMessage[TField],
): MockedChatPreset {
    return {
        ...previousDraft,
        messages: previousDraft.messages.map((message) => {
            if (message.id !== messageId) {
                return message;
            }

            return {
                ...message,
                [field]: value,
            };
        }),
    };
}

/**
 * Removes one scripted message.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithRemovedMessage(previousDraft: MockedChatPreset, messageId: string): MockedChatPreset {
    return {
        ...previousDraft,
        messages: previousDraft.messages.filter((message) => message.id !== messageId),
    };
}

/**
 * Resolves the participant used for newly added scripted messages.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function resolveDefaultMessageSenderId(participants: ReadonlyArray<MockedChatParticipant>): string {
    return participants.find((participant) => participant.isMe)?.id || participants[0]?.id || 'USER';
}
