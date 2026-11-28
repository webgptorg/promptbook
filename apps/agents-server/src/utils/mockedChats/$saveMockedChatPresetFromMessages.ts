import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';
import {
    createMockedChatPresetFromChatMessages,
    type MockedChatSourceMessage,
} from './createMockedChatPresetFromChatMessages';

/**
 * API endpoint shared with the mocked-chat editor.
 *
 * @private constant of `$saveMockedChatPresetFromMessages`
 */
const MOCKED_CHATS_API_ENDPOINT = '/api/system/mocked-chats';

/**
 * Route of the mocked-chat editor utility page.
 */
export const MOCKED_CHATS_EDITOR_ROUTE = '/system/utilities/mocked-chats';

/**
 * API payload returned by mocked-chat routes.
 *
 * @private type of `$saveMockedChatPresetFromMessages`
 */
type MockedChatsApiPayload = {
    mockedChats?: Array<MockedChatPreset>;
    error?: string;
};

/**
 * Builds one mocked-chat preset from recorded messages and persists it for the current user.
 *
 * Used by the "Create mock" buttons in the admin chat history and the external-chat view.
 *
 * @returns The persisted preset so callers can navigate to the editor.
 */
export async function $saveMockedChatPresetFromMessages(options: {
    name: string;
    messages: ReadonlyArray<MockedChatSourceMessage>;
}): Promise<MockedChatPreset> {
    const preset = createMockedChatPresetFromChatMessages(options);

    const currentResponse = await fetch(MOCKED_CHATS_API_ENDPOINT, { method: 'GET' });
    const currentPayload = (await currentResponse.json().catch(() => ({}))) as MockedChatsApiPayload;
    if (!currentResponse.ok || !Array.isArray(currentPayload.mockedChats)) {
        throw new Error(currentPayload.error || 'Failed to load existing mocked chats.');
    }

    const saveResponse = await fetch(MOCKED_CHATS_API_ENDPOINT, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mockedChats: [...currentPayload.mockedChats, preset] }),
    });
    const savePayload = (await saveResponse.json().catch(() => ({}))) as MockedChatsApiPayload;
    if (!saveResponse.ok || !Array.isArray(savePayload.mockedChats)) {
        throw new Error(savePayload.error || 'Failed to save the mocked chat.');
    }

    return savePayload.mockedChats.find((mockedChat) => mockedChat.id === preset.id) || preset;
}
