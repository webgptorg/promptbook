import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';

/**
 * API endpoint used by the mocked-chat editor.
 *
 * @private constant of <MockedChatsEditorClient/>
 */
const MOCKED_CHATS_API_ENDPOINT = '/api/system/mocked-chats';

/**
 * API payload returned by mocked-chat routes.
 *
 * @private type of <MockedChatsEditorClient/>
 */
type MockedChatsApiPayload = {
    mockedChats: Array<MockedChatPreset>;
};

/**
 * Persists one full mocked-chat list and returns server-normalized records.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export async function persistMockedChats(nextMockedChats: Array<MockedChatPreset>): Promise<Array<MockedChatPreset>> {
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
export function resolveMockedChatsActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}
