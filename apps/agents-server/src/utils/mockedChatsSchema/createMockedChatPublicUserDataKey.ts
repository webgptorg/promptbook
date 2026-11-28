import { MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX } from './MOCKED_CHATS_USER_DATA_KEY';

/**
 * Builds one `UserData.key` used for looking up a public mocked chat by id.
 */
export function createMockedChatPublicUserDataKey(mockedChatId: string): string {
    return `${MOCKED_CHAT_PUBLIC_USER_DATA_KEY_PREFIX}${mockedChatId}`;
}
