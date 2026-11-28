import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Resolves the prefixed timeout table name without relying on generated schema typings.
 *
 * @private function of userChatTimeoutStore
 */
export async function getUserChatTimeoutTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}UserChatTimeout`;
}
