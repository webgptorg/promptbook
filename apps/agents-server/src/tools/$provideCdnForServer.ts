import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
import { TrackedFilesStorage } from '../utils/cdn/classes/TrackedFilesStorage';
import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';

/**
 * Region expected by the bundled VersityGW S3-compatible storage.
 *
 * @private internal default for `$provideCdnForServer`
 */
const SELF_CONTAINED_S3_DEFAULT_REGION = 'us-east-1';

/**
 * Legacy fallback used by Cloudflare R2-style external S3 configuration.
 *
 * @private internal default for `$provideCdnForServer`
 */
const EXTERNAL_S3_DEFAULT_REGION = 'auto';

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
            region: resolveS3CompatibleStorageRegion(),
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
    const storageMode = getS3CompatibleStorageMode();
    const isS3StorageMode =
        storageMode === 's3' || storageMode === 'external-s3' || storageMode === 'self-contained-s3';

    if (isS3StorageMode) {
        return hasS3CompatibleStorageConfiguration();
    }

    return !process.env.VERCEL_BLOB_READ_WRITE_TOKEN && hasS3CompatibleStorageConfiguration();
}

/**
 * Resolves the configured S3-compatible storage mode.
 *
 * @private helper of `$provideCdnForServer`
 */
function getS3CompatibleStorageMode(): string {
    return (process.env.PTBK_FILE_STORAGE_MODE || process.env.CDN_PROVIDER || '').toLowerCase();
}

/**
 * Resolves the S3 signing region used by AWS SDK requests.
 *
 * @private helper of `$provideCdnForServer`
 */
function resolveS3CompatibleStorageRegion(): string {
    const configuredRegion = process.env.CDN_REGION?.trim();
    if (configuredRegion) {
        return configuredRegion;
    }

    if (getS3CompatibleStorageMode() === 'self-contained-s3') {
        return SELF_CONTAINED_S3_DEFAULT_REGION;
    }

    return EXTERNAL_S3_DEFAULT_REGION;
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
