import { getMetadataMap } from '@/src/database/getMetadata';

/**
 * Metadata keys storing GitHub App configuration.
 */
const GITHUB_APP_METADATA_KEYS = [
    'GITHUB_APP_ID',
    'GITHUB_APP_SLUG',
    'GITHUB_APP_PRIVATE_KEY',
    'GITHUB_APP_STATE_SECRET',
] as const;

/**
 * One of the metadata keys that store GitHub App configuration and can be customized per server.
 */
type GithubAppMetadataKey = (typeof GITHUB_APP_METADATA_KEYS)[number];

/**
 * Parsed GitHub App environment configuration.
 *
 * @private function of githubApp
 */
export type GithubAppConfiguration = {
    appId: string;
    appSlug: string;
    privateKey: string;
    stateSecret: string;
};

/**
 * Loads normalized GitHub App configuration from server metadata or legacy environment values.
 *
 * @private function of githubApp
 */
export async function loadGithubAppConfiguration(): Promise<GithubAppConfiguration | null> {
    const metadata = await getMetadataMap(GITHUB_APP_METADATA_KEYS);

    const appId = getGithubAppConfigurationValue({
        metadata,
        key: 'GITHUB_APP_ID',
        fallback: process.env.GITHUB_APP_ID,
    });
    const appSlug = getGithubAppConfigurationValue({
        metadata,
        key: 'GITHUB_APP_SLUG',
        fallback: process.env.GITHUB_APP_SLUG,
    });
    const privateKeyRaw = getGithubAppConfigurationValue({
        metadata,
        key: 'GITHUB_APP_PRIVATE_KEY',
        fallback: process.env.GITHUB_APP_PRIVATE_KEY,
    });
    const stateSecret = getGithubAppConfigurationValue({
        metadata,
        key: 'GITHUB_APP_STATE_SECRET',
        fallback: process.env.GITHUB_APP_STATE_SECRET || process.env.ADMIN_PASSWORD,
    });

    if (!appId || !appSlug || !privateKeyRaw || !stateSecret) {
        return null;
    }

    return {
        appId,
        appSlug,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        stateSecret,
    };
}

/**
 * Ensures GitHub App configuration exists and throws when it does not.
 *
 * @private function of githubApp
 */
export async function ensureGithubAppConfiguration(): Promise<GithubAppConfiguration> {
    const configuration = await loadGithubAppConfiguration();
    if (!configuration) {
        throw new Error('GitHub App is not configured.');
    }

    return configuration;
}

/**
 * Resolves one metadata/environment GitHub App value into a trimmed string.
 */
function getGithubAppConfigurationValue(options: {
    metadata: Record<string, string | null | undefined>;
    key: GithubAppMetadataKey;
    fallback?: string;
}): string {
    return (options.metadata[options.key] ?? '').trim() || (options.fallback?.trim() || '');
}
