import { createMockedChatId, type MockedChatPreset } from '@/src/utils/mockedChatsSchema';
import { cloneMockedChatPreset } from './cloneMockedChatPreset';

/**
 * Creates a local duplicate draft from the current editor content.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDuplicatedDraft(draftChat: MockedChatPreset): MockedChatPreset {
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
export function createNormalizedDraftForSave(
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
export function createDraftForSaveAsNew(draftChat: MockedChatPreset): MockedChatPreset {
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
