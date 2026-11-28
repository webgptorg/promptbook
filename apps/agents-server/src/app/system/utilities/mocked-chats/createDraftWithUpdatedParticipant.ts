import {
    createMockedChatParticipantId,
    type MockedChatParticipant,
    type MockedChatPreset,
    type MockedChatScriptedMessage,
} from '@/src/utils/mockedChatsSchema';

/**
 * Adds one participant to the current draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithAddedParticipant(previousDraft: MockedChatPreset): MockedChatPreset {
    const nextParticipants = [...previousDraft.participants, createDraftParticipant(previousDraft.participants.length)];

    return {
        ...previousDraft,
        participants: nextParticipants,
    };
}

/**
 * Updates one participant field in the draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithUpdatedParticipant<TField extends keyof MockedChatParticipant>(
    previousDraft: MockedChatPreset,
    participantId: string,
    field: TField,
    value: MockedChatParticipant[TField],
): MockedChatPreset {
    const nextParticipants = updateParticipantsAfterFieldChange(previousDraft.participants, participantId, field, value);
    const fallbackSenderId = nextParticipants[0]?.id || previousDraft.messages[0]?.senderId || 'USER';

    return {
        ...previousDraft,
        participants: nextParticipants,
        messages: reconcileMessageSenderIds(previousDraft.messages, nextParticipants, fallbackSenderId),
    };
}

/**
 * Removes one participant from the draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithRemovedParticipant(previousDraft: MockedChatPreset, participantId: string): MockedChatPreset {
    const remainingParticipants = previousDraft.participants.filter((participant) => participant.id !== participantId);
    if (remainingParticipants.length === 0) {
        return previousDraft;
    }

    const nextParticipants = ensureParticipantMarkedAsMe(remainingParticipants);
    const fallbackSenderId = nextParticipants[0]?.id || 'USER';

    return {
        ...previousDraft,
        participants: nextParticipants,
        messages: reconcileMessageSenderIds(previousDraft.messages, nextParticipants, fallbackSenderId),
    };
}

/**
 * Creates one participant draft with deterministic defaults.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDraftParticipant(participantCount: number): MockedChatParticipant {
    return {
        id: createMockedChatParticipantId(),
        name: `Participant ${participantCount + 1}`,
        isMe: participantCount === 0,
        bubbleColor: '#2563eb',
        avatarUrl: null,
        typingAvatarUrl: null,
    };
}

/**
 * Ensures at least one participant remains marked as `isMe`.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function ensureParticipantMarkedAsMe(participants: Array<MockedChatParticipant>): Array<MockedChatParticipant> {
    if (participants.some((participant) => participant.isMe) || participants.length === 0) {
        return participants;
    }

    const nextParticipants = [...participants];
    nextParticipants[0] = {
        ...nextParticipants[0],
        isMe: true,
    };
    return nextParticipants;
}

/**
 * Reconciles message sender ids after participant changes.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function reconcileMessageSenderIds(
    messages: ReadonlyArray<MockedChatScriptedMessage>,
    participants: ReadonlyArray<MockedChatParticipant>,
    fallbackSenderId: string,
): Array<MockedChatScriptedMessage> {
    return messages.map((message) => ({
        ...message,
        senderId: participants.some((participant) => participant.id === message.senderId)
            ? message.senderId
            : fallbackSenderId,
    }));
}

/**
 * Applies one participant field update and keeps the "me" invariant.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function updateParticipantsAfterFieldChange<TField extends keyof MockedChatParticipant>(
    participants: ReadonlyArray<MockedChatParticipant>,
    participantId: string,
    field: TField,
    value: MockedChatParticipant[TField],
): Array<MockedChatParticipant> {
    let nextParticipants = participants.map((participant) => {
        if (participant.id !== participantId) {
            return participant;
        }

        return {
            ...participant,
            [field]: value,
        };
    });

    if (field === 'isMe' && value === true) {
        nextParticipants = nextParticipants.map((participant) => ({
            ...participant,
            isMe: participant.id === participantId,
        }));
    }

    return nextParticipants;
}
