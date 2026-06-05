import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
import { TrackedFilesStorage } from '../utils/cdn/classes/TrackedFilesStorage';
import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';

/**
 * Options controlling CDN storage construction for the current server request.
 */
export type ProvideCdnForServerOptions = {
    /**
     * Public URL used when generating file links.
     */
    readonly cdnPublicUrl?: URL;
};

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
 * Cache of CDN instances by public URL.
 *
 * @private internal cache for `$provideCdnForServer`
 */
const cdnByPublicUrl = new Map<string, IIFilesStorageWithCdn>();

/**
 * Provides a CDN storage interface for server-side file operations, with caching to reuse instances.
 *
 * @param options - Optional request-aware CDN public URL override.
 * @returns CDN storage interface.
 */
export function $provideCdnForServer(options: ProvideCdnForServerOptions = {}): IIFilesStorageWithCdn {
    const cdnPublicUrl = options.cdnPublicUrl || resolveConfiguredCdnPublicUrl();
    const cdnCacheKey = cdnPublicUrl.href;
    let cdn = cdnByPublicUrl.get(cdnCacheKey);

    if (!cdn) {
        const inner = createCdnStorageForServer(cdnPublicUrl);
        const supabase = $provideSupabaseForServer();
        cdn = new TrackedFilesStorage(inner, supabase);
        cdnByPublicUrl.set(cdnCacheKey, cdn);
    }

    return cdn;
}

/**
 * Creates the configured CDN storage implementation for server-side file operations.
 *
 * @param cdnPublicUrl - Public URL used to build deterministic file links.
 * @private helper of `$provideCdnForServer`
 */
function createCdnStorageForServer(cdnPublicUrl: URL): IIFilesStorageWithCdn {
    if (isS3CompatibleStorageSelected()) {
        return new DigitalOceanSpaces({
            bucket: process.env.CDN_BUCKET!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
            endpoint: process.env.CDN_ENDPOINT!,
            accessKeyId: process.env.CDN_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
            cdnPublicUrl,
            gzip: true,
            forcePathStyle: process.env.CDN_FORCE_PATH_STYLE === 'true',
            region: resolveS3CompatibleStorageRegion(),
        });
    }

    return new VercelBlobStorage({
        token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
        pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '',
        cdnPublicUrl,
    });
}

/**
 * Resolves the CDN public URL from environment configuration.
 *
 * @returns Configured CDN public URL.
 * @private helper of `$provideCdnForServer`
 */
function resolveConfiguredCdnPublicUrl(): URL {
    return new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!);
}

/**
 * Resolves the public URL that should be used for CDN links for one server request.
 *
 * Self-contained S3 is proxied through the current server domain. The configured
 * CDN public URL still owns the `/s3/<bucket>` path, but the origin must follow
 * the active server so uploads are not published under the VPS raw IP address.
 *
 * @param serverPublicUrl - Public URL of the active server.
 * @returns Request-aware CDN public URL.
 */
export function resolveCdnPublicUrlForServer(serverPublicUrl: URL): URL {
    const configuredCdnPublicUrl = resolveConfiguredCdnPublicUrl();

    if (!isSelfContainedS3StorageSelected()) {
        return configuredCdnPublicUrl;
    }

    const cdnPublicUrl = new URL(configuredCdnPublicUrl.href);
    cdnPublicUrl.protocol = serverPublicUrl.protocol;
    cdnPublicUrl.host = serverPublicUrl.host;
    cdnPublicUrl.username = '';
    cdnPublicUrl.password = '';

    return cdnPublicUrl;
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
 * Checks whether the bundled self-contained S3 storage mode is selected.
 *
 * @returns `true` when self-contained S3 is selected.
 */
export function isSelfContainedS3StorageSelected(): boolean {
    return getS3CompatibleStorageMode() === 'self-contained-s3';
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

    if (isSelfContainedS3StorageSelected()) {
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
