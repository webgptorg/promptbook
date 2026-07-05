import { useMemo, useState } from 'react';
import {
    createDefaultMockedChatPreset,
    type MockedChatParticipant,
    type MockedChatPreset,
    type MockedChatScriptedMessage,
    type MockedChatTimingPreset,
    type MockedChatViewportPreset,
} from '@/src/utils/mockedChatsSchema';
import { cloneMockedChatPreset } from './cloneMockedChatPreset';
import { confirmDeleteMockedChat } from './confirmDeleteMockedChat';
import { createDraftForSaveAsNew, createDuplicatedDraft, createNormalizedDraftForSave } from './createDuplicatedDraft';
import {
    createDraftWithAddedMessage,
    createDraftWithRemovedMessage,
    createDraftWithUpdatedMessage,
} from './createDraftWithUpdatedMessage';
import {
    createDraftWithAddedParticipant,
    createDraftWithRemovedParticipant,
    createDraftWithUpdatedParticipant,
} from './createDraftWithUpdatedParticipant';
import { createDraftWithUpdatedSettings } from './createDraftWithUpdatedSettings';
import { findMockedChatById, isMockedChatDraftDirty, upsertMockedChatPreset } from './findMockedChatById';
import { persistMockedChats, resolveMockedChatsActionErrorMessage } from './persistMockedChats';

/**
 * Props for `useMockedChatsEditorState`.
 */
type UseMockedChatsEditorStateProps = {
    initialMockedChats: Array<MockedChatPreset>;
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
