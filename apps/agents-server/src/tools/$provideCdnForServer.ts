import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
import { TrackedFilesStorage } from '../utils/cdn/classes/TrackedFilesStorage';
import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';

/**
 * Cache of CDN instance
 *
 * @private internal cache for `$provideCdnForServer`
 */
let cdn: IIFilesStorageWithCdn | null = null;

/**
 * Provides a CDN storage interface for server-side file operations, with caching to reuse instances.
 */
export function $provideCdnForServer(): IIFilesStorageWithCdn {
    if (!cdn) {
        const inner = createCdnStorageForServer();
        const supabase = $provideSupabaseForServer();
        cdn = new TrackedFilesStorage(inner, supabase);
    }

    return cdn;
}

/**
 * Creates the configured CDN storage implementation for server-side file operations.
 *
 * @private helper of `$provideCdnForServer`
 */
function createCdnStorageForServer(): IIFilesStorageWithCdn {
    if (isS3CompatibleStorageSelected()) {
        return new DigitalOceanSpaces({
            bucket: process.env.CDN_BUCKET!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
            endpoint: process.env.CDN_ENDPOINT!,
            accessKeyId: process.env.CDN_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
            cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
            gzip: true,
            forcePathStyle: process.env.CDN_FORCE_PATH_STYLE === 'true',
            region: process.env.CDN_REGION || 'auto',
        });
    }

    return new VercelBlobStorage({
        token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
        pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
        cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
    });
}

/**
 * Checks whether the current environment should use the S3-compatible storage implementation.
 *
 * @private helper of `$provideCdnForServer`
 */
function isS3CompatibleStorageSelected(): boolean {
    const storageMode = (process.env.PTBK_FILE_STORAGE_MODE || process.env.CDN_PROVIDER || '').toLowerCase();
    const isS3StorageMode =
        storageMode === 's3' || storageMode === 'external-s3' || storageMode === 'self-contained-s3';

    if (isS3StorageMode) {
        return hasS3CompatibleStorageConfiguration();
    }

    return !process.env.VERCEL_BLOB_READ_WRITE_TOKEN && hasS3CompatibleStorageConfiguration();
}

/**
 * Checks whether all S3-compatible storage environment variables are present.
 *
 * @private helper of `$provideCdnForServer`
 */
function hasS3CompatibleStorageConfiguration(): boolean {
    return Boolean(
        process.env.CDN_BUCKET &&
            process.env.CDN_ENDPOINT &&
            process.env.CDN_ACCESS_KEY_ID &&
            process.env.CDN_SECRET_ACCESS_KEY &&
            process.env.NEXT_PUBLIC_CDN_PUBLIC_URL,
    );
}

// TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
