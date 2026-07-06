import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Resolves the prefixed Shibboleth authentication attempt table name without relying on generated schema typings.
 *
 * @returns Prefixed table name.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function getShibbolethAuthenticationAttemptTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}ShibbolethAuthenticationAttempt`;
}
