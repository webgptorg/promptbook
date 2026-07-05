import type { MockedChatPreset, MockedChatSettings } from '@/src/utils/mockedChatsSchema';

/**
 * Applies one settings patch to the draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function createDraftWithUpdatedSettings(
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
