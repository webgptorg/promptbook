import { useMemo, useState } from 'react';
import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    createDefaultMockedChatPreset,
    createMockedChatId,
    createMockedChatMessageId,
    createMockedChatParticipantId,
    type MockedChatParticipant,
    type MockedChatPreset,
    type MockedChatScriptedMessage,
    type MockedChatSettings,
    type MockedChatTimingPreset,
    type MockedChatViewportPreset,
} from '@/src/utils/mockedChatsSchema';

/**
 * API endpoint used by the mocked-chat editor.
 */
const MOCKED_CHATS_API_ENDPOINT = '/api/system/mocked-chats';

/**
 * Fallback offset distance when adding new scripted messages.
 */
const DEFAULT_NEW_MESSAGE_OFFSET_STEP_MS = 1_200;

/**
 * Props for `useMockedChatsEditorState`.
 */
type UseMockedChatsEditorStateProps = {
    initialMockedChats: Array<MockedChatPreset>;
};

/**
 * API payload returned by mocked-chat routes.
 */
type MockedChatsApiPayload = {
    mockedChats: Array<MockedChatPreset>;
};

/**
 * Shared state contract used by the private mocked-chat editor modules.
 *
 * @private internal type of <MockedChatsEditorClient/>
 */
export type UseMockedChatsEditorState = {
    savedChats: Array<MockedChatPreset>;
    selectedChatId: string | null;
    draftChat: MockedChatPreset;
    isSaving: boolean;
    statusMessage: string | null;
    errorMessage: string | null;
    isDraftPersisted: boolean;
    isDraftDirty: boolean;
    createNewDraft: () => void;
    selectSavedChat: (chatId: string) => void;
    duplicateDraft: () => void;
    saveDraft: () => Promise<void>;
    saveDraftAsNew: () => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    updateDraftName: (name: string) => void;
    updateDraftBackgroundColor: (backgroundColor: string | null) => void;
    updateDraftBackgroundImageUrl: (backgroundImageUrl: string | null) => void;
    addParticipant: () => void;
    updateParticipant: <TField extends keyof MockedChatParticipant>(
        participantId: string,
        field: TField,
        value: MockedChatParticipant[TField],
    ) => void;
    removeParticipant: (participantId: string) => void;
    addMessage: () => void;
    updateMessage: <TField extends keyof MockedChatScriptedMessage>(
        messageId: string,
        field: TField,
        value: MockedChatScriptedMessage[TField],
    ) => void;
    removeMessage: (messageId: string) => void;
    updateTimingPreset: (timingPreset: MockedChatTimingPreset) => void;
    updateViewportPreset: (viewportPreset: MockedChatViewportPreset) => void;
    updateShowTimestamps: (isShowTimestamps: boolean) => void;
    updateLoopPlayback: (isLoopPlayback: boolean) => void;
};

/**
 * One persisted mocked-chat mutation flow.
 *
 * @private function of <MockedChatsEditorClient/>
 */
type PersistedChatsMutation = {
    nextMockedChats: Array<MockedChatPreset>;
    successMessage: string;
    fallbackErrorMessage: string;
    applyPersistedChats: (persistedChats: Array<MockedChatPreset>) => void;
};

/**
 * Clones one mocked-chat preset so editor state does not mutate saved references.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function cloneMockedChatPreset(preset: MockedChatPreset): MockedChatPreset {
    return {
        ...preset,
        participants: preset.participants.map((participant) => ({ ...participant })),
        messages: preset.messages.map((message) => ({ ...message })),
        settings: {
            ...preset.settings,
        },
    };
}

/**
 * Finds one mocked chat by id.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function findMockedChatById(
    mockedChats: ReadonlyArray<MockedChatPreset>,
    mockedChatId: string | null,
): MockedChatPreset | null {
    if (!mockedChatId) {
        return null;
    }

    return mockedChats.find((mockedChat) => mockedChat.id === mockedChatId) || null;
}

/**
 * Checks whether the draft differs from the selected saved chat.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function isMockedChatDraftDirty(selectedSavedChat: MockedChatPreset | null, draftChat: MockedChatPreset): boolean {
    if (!selectedSavedChat) {
        return true;
    }

    return JSON.stringify(selectedSavedChat) !== JSON.stringify(draftChat);
}

/**
 * Persists one full mocked-chat list and returns server-normalized records.
 *
 * @private function of <MockedChatsEditorClient/>
 */
async function persistMockedChats(nextMockedChats: Array<MockedChatPreset>): Promise<Array<MockedChatPreset>> {
    const response = await fetch(MOCKED_CHATS_API_ENDPOINT, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mockedChats: nextMockedChats }),
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<MockedChatsApiPayload> & {
        error?: string;
    };

    if (!response.ok || !Array.isArray(payload.mockedChats)) {
        throw new Error(payload.error || 'Failed to save mocked chats.');
    }

    return payload.mockedChats;
}

/**
 * Resolves the user-facing error message for one mocked-chat action.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function resolveMockedChatsActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Requests confirmation before deleting one mocked chat.
 *
 * @private function of <MockedChatsEditorClient/>
 */
async function confirmDeleteMockedChat(targetChat: MockedChatPreset): Promise<boolean> {
    return showConfirm({
        title: 'Delete mocked chat',
        message: `Delete "${targetChat.name}"? This cannot be undone.`,
        confirmLabel: 'Delete mocked chat',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Builds a user-friendly duplicate name.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function buildCopyName(name: string): string {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return 'Untitled mocked chat copy';
    }

    return trimmedName.toLowerCase().endsWith('copy') ? trimmedName : `${trimmedName} copy`;
}

/**
 * Creates a local duplicate draft from the current editor content.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDuplicatedDraft(draftChat: MockedChatPreset): MockedChatPreset {
    const duplicatedDraft = cloneMockedChatPreset(draftChat);
    duplicatedDraft.id = createMockedChatId();
    duplicatedDraft.name = buildCopyName(draftChat.name);
    duplicatedDraft.createdAt = new Date().toISOString();
    duplicatedDraft.updatedAt = duplicatedDraft.createdAt;
    return duplicatedDraft;
}

/**
 * Normalizes the draft before saving it over its current id.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createNormalizedDraftForSave(
    draftChat: MockedChatPreset,
    selectedSavedChat: MockedChatPreset | null,
): MockedChatPreset {
    const nowIso = new Date().toISOString();

    return {
        ...cloneMockedChatPreset(draftChat),
        name: draftChat.name.trim() || 'Untitled mocked chat',
        updatedAt: nowIso,
        createdAt: selectedSavedChat?.createdAt || draftChat.createdAt || nowIso,
    };
}

/**
 * Creates the saved-copy payload used by "Save as New".
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDraftForSaveAsNew(draftChat: MockedChatPreset): MockedChatPreset {
    const nowIso = new Date().toISOString();

    return {
        ...cloneMockedChatPreset(draftChat),
        id: createMockedChatId(),
        name: buildCopyName(draftChat.name),
        createdAt: nowIso,
        updatedAt: nowIso,
    };
}

/**
 * Upserts one mocked-chat preset by id while preserving list order by updated date.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function upsertMockedChatPreset(
    presets: ReadonlyArray<MockedChatPreset>,
    incomingPreset: MockedChatPreset,
): Array<MockedChatPreset> {
    const existingIndex = presets.findIndex((preset) => preset.id === incomingPreset.id);
    const nextPresets = [...presets];

    if (existingIndex === -1) {
        nextPresets.push(incomingPreset);
    } else {
        nextPresets[existingIndex] = incomingPreset;
    }

    return nextPresets.sort((leftPreset, rightPreset) => Date.parse(rightPreset.updatedAt) - Date.parse(leftPreset.updatedAt));
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

/**
 * Resolves the participant used for newly added scripted messages.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function resolveDefaultMessageSenderId(participants: ReadonlyArray<MockedChatParticipant>): string {
    return participants.find((participant) => participant.isMe)?.id || participants[0]?.id || 'USER';
}

/**
 * Adds one participant to the current draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDraftWithAddedParticipant(previousDraft: MockedChatPreset): MockedChatPreset {
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
function createDraftWithUpdatedParticipant<TField extends keyof MockedChatParticipant>(
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
function createDraftWithRemovedParticipant(previousDraft: MockedChatPreset, participantId: string): MockedChatPreset {
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
 * Adds one scripted message at the end of the sequence.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDraftWithAddedMessage(previousDraft: MockedChatPreset): MockedChatPreset {
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
function createDraftWithUpdatedMessage<TField extends keyof MockedChatScriptedMessage>(
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
function createDraftWithRemovedMessage(previousDraft: MockedChatPreset, messageId: string): MockedChatPreset {
    return {
        ...previousDraft,
        messages: previousDraft.messages.filter((message) => message.id !== messageId),
    };
}

/**
 * Applies one settings patch to the draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function createDraftWithUpdatedSettings(
    previousDraft: MockedChatPreset,
    settingsPatch: Partial<MockedChatSettings>,
): MockedChatPreset {
    return {
        ...previousDraft,
        settings: {
            ...previousDraft.settings,
            ...settingsPatch,
        },
    };
}

/**
 * Manages mocked-chat editor state, persistence, and draft mutations.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function useMockedChatsEditorState({
    initialMockedChats,
}: UseMockedChatsEditorStateProps): UseMockedChatsEditorState {
    const initialSelectedChat = initialMockedChats[0] || null;

    const [savedChats, setSavedChats] = useState<Array<MockedChatPreset>>(initialMockedChats);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedChat?.id || null);
    const [draftChat, setDraftChat] = useState<MockedChatPreset>(() =>
        initialSelectedChat ? cloneMockedChatPreset(initialSelectedChat) : createDefaultMockedChatPreset(),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const selectedSavedChat = useMemo(
        () => findMockedChatById(savedChats, selectedChatId),
        [savedChats, selectedChatId],
    );
    const isDraftPersisted = useMemo(() => savedChats.some((chat) => chat.id === draftChat.id), [savedChats, draftChat.id]);
    const isDraftDirty = useMemo(
        () => isMockedChatDraftDirty(selectedSavedChat, draftChat),
        [draftChat, selectedSavedChat],
    );

    const clearFeedbackMessages = () => {
        setStatusMessage(null);
        setErrorMessage(null);
    };

    const applyPersistedDraftSelection = (persistedChats: Array<MockedChatPreset>, mockedChatId: string) => {
        const persistedDraft = findMockedChatById(persistedChats, mockedChatId);
        if (!persistedDraft) {
            return;
        }

        setSelectedChatId(persistedDraft.id);
        setDraftChat(cloneMockedChatPreset(persistedDraft));
    };

    const applyDeleteFallbackDraft = (persistedChats: Array<MockedChatPreset>) => {
        const fallbackChat = persistedChats[0] || null;
        if (!fallbackChat) {
            setSelectedChatId(null);
            setDraftChat(createDefaultMockedChatPreset());
            return;
        }

        setSelectedChatId(fallbackChat.id);
        setDraftChat(cloneMockedChatPreset(fallbackChat));
    };

    const runPersistedChatsMutation = async ({
        nextMockedChats,
        successMessage,
        fallbackErrorMessage,
        applyPersistedChats,
    }: PersistedChatsMutation) => {
        setIsSaving(true);
        clearFeedbackMessages();

        try {
            const persistedChats = await persistMockedChats(nextMockedChats);
            setSavedChats(persistedChats);
            applyPersistedChats(persistedChats);
            setStatusMessage(successMessage);
        } catch (error) {
            setErrorMessage(resolveMockedChatsActionErrorMessage(error, fallbackErrorMessage));
        } finally {
            setIsSaving(false);
        }
    };

    const selectSavedChat = (chatId: string) => {
        const selectedChat = findMockedChatById(savedChats, chatId);
        if (!selectedChat) {
            return;
        }

        setSelectedChatId(selectedChat.id);
        setDraftChat(cloneMockedChatPreset(selectedChat));
        clearFeedbackMessages();
    };

    const createNewDraft = () => {
        setSelectedChatId(null);
        setDraftChat(createDefaultMockedChatPreset());
        setStatusMessage('Started a new mocked chat draft.');
        setErrorMessage(null);
    };

    const duplicateDraft = () => {
        setSelectedChatId(null);
        setDraftChat(createDuplicatedDraft(draftChat));
        setStatusMessage('Created a duplicate draft. Save to persist it.');
        setErrorMessage(null);
    };

    const saveDraft = async () => {
        const normalizedDraft = createNormalizedDraftForSave(draftChat, selectedSavedChat);

        await runPersistedChatsMutation({
            nextMockedChats: upsertMockedChatPreset(savedChats, normalizedDraft),
            successMessage: 'Mocked chat saved.',
            fallbackErrorMessage: 'Failed to save mocked chat.',
            applyPersistedChats: (persistedChats) => applyPersistedDraftSelection(persistedChats, normalizedDraft.id),
        });
    };

    const saveDraftAsNew = async () => {
        const duplicatedDraft = createDraftForSaveAsNew(draftChat);

        await runPersistedChatsMutation({
            nextMockedChats: upsertMockedChatPreset(savedChats, duplicatedDraft),
            successMessage: 'Saved as a new mocked chat.',
            fallbackErrorMessage: 'Failed to save as new mocked chat.',
            applyPersistedChats: (persistedChats) => applyPersistedDraftSelection(persistedChats, duplicatedDraft.id),
        });
    };

    const deleteChat = async (chatId: string) => {
        const targetChat = findMockedChatById(savedChats, chatId);
        if (!targetChat) {
            return;
        }

        const isConfirmed = await confirmDeleteMockedChat(targetChat);
        if (!isConfirmed) {
            return;
        }

        await runPersistedChatsMutation({
            nextMockedChats: savedChats.filter((chat) => chat.id !== chatId),
            successMessage: 'Mocked chat deleted.',
            fallbackErrorMessage: 'Failed to delete mocked chat.',
            applyPersistedChats: applyDeleteFallbackDraft,
        });
    };

    const updateDraftName = (name: string) => {
        setDraftChat((previousDraft) => ({
            ...previousDraft,
            name,
        }));
    };

    const updateDraftBackgroundColor = (backgroundColor: string | null) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { backgroundColor }));
    };

    const updateDraftBackgroundImageUrl = (backgroundImageUrl: string | null) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { backgroundImageUrl }));
    };

    const addParticipant = () => {
        setDraftChat(createDraftWithAddedParticipant);
    };

    const updateParticipant = <TField extends keyof MockedChatParticipant>(
        participantId: string,
        field: TField,
        value: MockedChatParticipant[TField],
    ) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedParticipant(previousDraft, participantId, field, value));
    };

    const removeParticipant = (participantId: string) => {
        setDraftChat((previousDraft) => createDraftWithRemovedParticipant(previousDraft, participantId));
    };

    const addMessage = () => {
        setDraftChat(createDraftWithAddedMessage);
    };

    const updateMessage = <TField extends keyof MockedChatScriptedMessage>(
        messageId: string,
        field: TField,
        value: MockedChatScriptedMessage[TField],
    ) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedMessage(previousDraft, messageId, field, value));
    };

    const removeMessage = (messageId: string) => {
        setDraftChat((previousDraft) => createDraftWithRemovedMessage(previousDraft, messageId));
    };

    const updateTimingPreset = (timingPreset: MockedChatTimingPreset) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { timingPreset }));
    };

    const updateViewportPreset = (viewportPreset: MockedChatViewportPreset) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { viewportPreset }));
    };

    const updateShowTimestamps = (isShowTimestamps: boolean) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { showTimestamps: isShowTimestamps }));
    };

    const updateLoopPlayback = (isLoopPlayback: boolean) => {
        setDraftChat((previousDraft) => createDraftWithUpdatedSettings(previousDraft, { loopPlayback: isLoopPlayback }));
    };

    return {
        savedChats,
        selectedChatId,
        draftChat,
        isSaving,
        statusMessage,
        errorMessage,
        isDraftPersisted,
        isDraftDirty,
        createNewDraft,
        selectSavedChat,
        duplicateDraft,
        saveDraft,
        saveDraftAsNew,
        deleteChat,
        updateDraftName,
        updateDraftBackgroundColor,
        updateDraftBackgroundImageUrl,
        addParticipant,
        updateParticipant,
        removeParticipant,
        addMessage,
        updateMessage,
        removeMessage,
        updateTimingPreset,
        updateViewportPreset,
        updateShowTimestamps,
        updateLoopPlayback,
    };
}
