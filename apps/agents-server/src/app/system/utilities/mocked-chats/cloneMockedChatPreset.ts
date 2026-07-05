import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';

/**
 * Clones one mocked-chat preset so editor state does not mutate saved references.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function cloneMockedChatPreset(preset: MockedChatPreset): MockedChatPreset {
    return {
        ...preset,
        participants: preset.participants.map((participant) => ({ ...participant })),
        messages: preset.messages.map((message) => ({ ...message })),
        settings: {
            ...preset.settings,
        },
    };
}
