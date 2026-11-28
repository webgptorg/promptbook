import { cookies } from 'next/headers';
import { getMetadataMap } from '../../database/getMetadata';
import {
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
    parseServerLanguageEnforcedMetadata,
    resolveServerLanguageCode,
    SERVER_LANGUAGE_COOKIE_NAME,
    SERVER_LANGUAGE_METADATA_KEY,
    type ServerLanguageCode,
} from '../../languages/ServerLanguageRegistry';

/**
 * Resolves the active Agents Server UI language for the current server-rendered request.
 *
 * @returns Active server language code derived from metadata and the language override cookie.
 * @private internal utility for server-rendered Agents Server UI.
 */
export async function getRequestServerLanguage(): Promise<ServerLanguageCode> {
    const [metadata, cookieStore] = await Promise.all([
        getMetadataMap([SERVER_LANGUAGE_METADATA_KEY, IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY]),
        cookies(),
    ]);

    const cookieLanguage = cookieStore.get(SERVER_LANGUAGE_COOKIE_NAME)?.value || null;
    const rawServerLanguage = metadata[SERVER_LANGUAGE_METADATA_KEY];
    const isServerLanguageEnforced = parseServerLanguageEnforcedMetadata(
        metadata[IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY],
    );
    const preferredLanguageSource = isServerLanguageEnforced ? rawServerLanguage : cookieLanguage || rawServerLanguage;

    return resolveServerLanguageCode(preferredLanguageSource);
}
