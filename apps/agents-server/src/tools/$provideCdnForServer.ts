import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
import { TrackedFilesStorage } from '../utils/cdn/classes/TrackedFilesStorage';
import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';
import { resolveCdnStorageProvider } from '../utils/cdn/resolveCdnStorageProvider';

/**
 * Environment value that enables path-style S3 requests.
 *
 * @private internal cache for `$provideCdnForServer`
 */
const TRUE_ENV_VALUE = 'true';

/**
 * Cache of raw CDN instance.
 *
 * @private internal cache for `$provideCdnForServer`
 */
let rawCdn: IIFilesStorageWithCdn | null = null;

/**
 * Cache of tracked CDN instance.
 *
 * @private internal cache for `$provideCdnForServer`
 */
let trackedCdn: IIFilesStorageWithCdn | null = null;

/**
 * Creates a CDN storage instance from environment variables.
 *
 * @private internal factory for `$provideCdnForServer`
 */
function createCdnForServer(): IIFilesStorageWithCdn {
    const provider = resolveCdnStorageProvider();

    switch (provider) {
        case 's3':
            return new DigitalOceanSpaces({
                bucket: process.env.CDN_BUCKET!,
                pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
                endpoint: process.env.CDN_ENDPOINT!,
                region: process.env.CDN_REGION || 'auto',
                accessKeyId: process.env.CDN_ACCESS_KEY_ID!,
                secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
                cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
                gzip: process.env.CDN_GZIP !== 'false',
                forcePathStyle: process.env.CDN_FORCE_PATH_STYLE === TRUE_ENV_VALUE,
                isPublicReadAclEnabled: process.env.CDN_ENABLE_PUBLIC_READ_ACL !== 'false',
            });

        case 'vercel':
            return new VercelBlobStorage({
                token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
                pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX!,
                cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
            });
    }
}

/**
 * Provides an untracked CDN storage interface for code paths that manage `File` rows themselves.
 *
 * @private internal cache for `$provideCdnForServer`
 */
export function $provideUntrackedCdnForServer(): IIFilesStorageWithCdn {
    if (!rawCdn) {
        rawCdn = createCdnForServer();
    }

    return rawCdn;
}

/**
 * Provides a CDN storage interface for server-side file operations, with caching to reuse instances.
 *
 * @private internal cache for `$provideCdnForServer`
 */
export function $provideCdnForServer(): IIFilesStorageWithCdn {
    if (!trackedCdn) {
        const inner = $provideUntrackedCdnForServer();
        const supabase = $provideSupabaseForServer();
        trackedCdn = new TrackedFilesStorage(inner, supabase);
    }

    return trackedCdn;
}

// TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
