import { EnvironmentMismatchError } from '../../../../src/errors/EnvironmentMismatchError';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
import { TrackedFilesStorage } from '../utils/cdn/classes/TrackedFilesStorage';
import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import type { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';

/**
 * Cache of CDN instance
 *
 * @private internal cache for `$provideCdnForServer`
 */
let cdn: IIFilesStorageWithCdn | null = null;

/**
 * Cache of untracked CDN instance.
 *
 * @private internal cache for `$provideUntrackedCdnForServer`
 */
let untrackedCdn: IIFilesStorageWithCdn | null = null;

/**
 * Supported server-side CDN storage providers.
 *
 * @private used by `$provideCdnForServer`
 */
type ServerCdnStorageProvider = 'vercel-blob' | 's3';

/**
 * Reads a required environment variable for CDN setup.
 *
 * @private used by `$provideCdnForServer`
 */
function getRequiredCdnEnvironmentValue(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new EnvironmentMismatchError(`Missing required CDN environment variable \`${key}\`.`);
    }

    return value;
}

/**
 * Parses boolean CDN environment values.
 *
 * @private used by `$provideCdnForServer`
 */
function parseBooleanEnvironmentValue(value: string | undefined): boolean {
    return value === '1' || value === 'true' || value === 'yes';
}

/**
 * Resolves the server-side CDN storage provider.
 *
 * @private used by `$provideCdnForServer`
 */
function resolveServerCdnStorageProvider(): ServerCdnStorageProvider {
    const provider = (
        process.env.PTBK_CDN_STORAGE_PROVIDER ||
        process.env.NEXT_PUBLIC_CDN_STORAGE_PROVIDER ||
        ''
    )
        .trim()
        .toLowerCase();

    if (provider === 's3' || provider === 'self-contained-s3' || provider === 'external-s3') {
        return 's3';
    }

    if (process.env.CDN_ENDPOINT && process.env.CDN_BUCKET) {
        return 's3';
    }

    return 'vercel-blob';
}

/**
 * Creates the untracked CDN storage implementation from environment configuration.
 *
 * @private used by `$provideCdnForServer`
 */
function createCdnForServer(): IIFilesStorageWithCdn {
    if (resolveServerCdnStorageProvider() === 's3') {
        return new DigitalOceanSpaces({
            bucket: getRequiredCdnEnvironmentValue('CDN_BUCKET'),
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
            endpoint: getRequiredCdnEnvironmentValue('CDN_ENDPOINT'),
            accessKeyId: getRequiredCdnEnvironmentValue('CDN_ACCESS_KEY_ID'),
            secretAccessKey: getRequiredCdnEnvironmentValue('CDN_SECRET_ACCESS_KEY'),
            cdnPublicUrl: new URL(getRequiredCdnEnvironmentValue('NEXT_PUBLIC_CDN_PUBLIC_URL')),
            gzip: true,
            region: process.env.CDN_REGION || 'auto',
            isPathStyleEndpoint: parseBooleanEnvironmentValue(process.env.CDN_S3_FORCE_PATH_STYLE),
            isPublicReadAclEnabled: parseBooleanEnvironmentValue(process.env.CDN_S3_PUBLIC_READ_ACL),
        });
    }

    return new VercelBlobStorage({
        token: getRequiredCdnEnvironmentValue('VERCEL_BLOB_READ_WRITE_TOKEN'),
        pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
        cdnPublicUrl: new URL(getRequiredCdnEnvironmentValue('NEXT_PUBLIC_CDN_PUBLIC_URL')),
    });
}

/**
 * Provides a CDN storage interface without database tracking.
 */
export function $provideUntrackedCdnForServer(): IIFilesStorageWithCdn {
    if (!untrackedCdn) {
        untrackedCdn = createCdnForServer();
    }

    return untrackedCdn;
}

/**
 * Provides a tracked CDN storage interface for server-side file operations, with caching to reuse instances.
 */
export function $provideCdnForServer(): IIFilesStorageWithCdn {
    if (!cdn) {
        const inner = $provideUntrackedCdnForServer();
        const supabase = $provideSupabaseForServer();
        cdn = new TrackedFilesStorage(inner, supabase);
    }

    return cdn;
}

// TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
