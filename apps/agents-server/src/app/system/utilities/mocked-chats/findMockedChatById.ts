import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';

/**
 * Finds one mocked chat by id.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function findMockedChatById(
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
export function isMockedChatDraftDirty(selectedSavedChat: MockedChatPreset | null, draftChat: MockedChatPreset): boolean {
    if (!selectedSavedChat) {
        return true;
    }

    return JSON.stringify(selectedSavedChat) !== JSON.stringify(draftChat);
}

/**
 * Upserts one mocked-chat preset by id while preserving list order by updated date.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function upsertMockedChatPreset(
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
