import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Resolves the prefixed Shibboleth identity table name without relying on generated schema typings.
 *
 * @returns Prefixed table name.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function getShibbolethUserIdentityTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}ShibbolethUserIdentity`;
}
