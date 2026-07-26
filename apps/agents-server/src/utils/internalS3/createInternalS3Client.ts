import { S3Client } from '@aws-sdk/client-s3';
import type { InternalS3Configuration } from './internalS3Types';

/**
 * Region expected by the bundled VersityGW S3-compatible storage when none is configured.
 *
 * [✨🏣] Matches `SELF_CONTAINED_S3_DEFAULT_REGION` used by `$provideCdnForServer`.
 *
 * @private helper of `createInternalS3Client`
 */
const INTERNAL_S3_DEFAULT_REGION = 'us-east-1';

/**
 * Normalizes an endpoint value that may be a bare host into a full URL.
 *
 * @param endpoint - Configured endpoint value.
 * @returns Endpoint with an explicit scheme.
 * @private helper of `createInternalS3Client`
 */
function normalizeInternalS3Endpoint(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
        return endpoint;
    }

    return `http://${endpoint}`;
}

/**
 * Builds an S3 client for the bundled self-contained (internal) S3 storage.
 *
 * The secret access key is read directly from the environment so it is never carried through
 * the display-oriented {@link InternalS3Configuration}.
 *
 * @param configuration - Internal S3 configuration (must be fully configured).
 * @returns S3 client bound to the internal endpoint.
 * @private internal utility of the `/admin/internal-s3` page
 */
export function createInternalS3Client(configuration: InternalS3Configuration): S3Client {
    return new S3Client({
        region: configuration.region || INTERNAL_S3_DEFAULT_REGION,
        endpoint: normalizeInternalS3Endpoint(configuration.endpoint!),
        forcePathStyle: configuration.isForcePathStyleEnabled,
        credentials: {
            accessKeyId: configuration.accessKeyId!,
            secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
        },
    });
}
