import { isSelfContainedS3StorageSelected } from '../../tools/$provideCdnForServer';
import type { InternalS3Configuration } from './internalS3Types';

/**
 * Trims an environment value and normalizes blank strings to `null`.
 *
 * @param value - Raw environment value.
 * @returns Trimmed value, or `null` when empty.
 * @private helper of `readInternalS3Configuration`
 */
function readOptionalEnvironmentValue(value: string | undefined): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
}

/**
 * Reads the bundled self-contained (internal) S3 storage configuration from the environment.
 *
 * The returned object never contains the secret access key — only whether it is configured.
 *
 * [✨🏣] Mirrors the environment contract consumed by `$provideCdnForServer` for self-contained S3.
 *
 * @returns Internal S3 configuration for display.
 * @private internal utility of the `/admin/internal-s3` page
 */
export function readInternalS3Configuration(): InternalS3Configuration {
    const endpoint = readOptionalEnvironmentValue(process.env.CDN_ENDPOINT);
    const bucket = readOptionalEnvironmentValue(process.env.CDN_BUCKET);
    const accessKeyId = readOptionalEnvironmentValue(process.env.CDN_ACCESS_KEY_ID);
    const publicUrl = readOptionalEnvironmentValue(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL);
    const isSecretAccessKeyConfigured = Boolean(readOptionalEnvironmentValue(process.env.CDN_SECRET_ACCESS_KEY));

    return {
        storageMode: readOptionalEnvironmentValue(process.env.PTBK_FILE_STORAGE_MODE ?? process.env.CDN_PROVIDER),
        isSelfContainedS3Selected: isSelfContainedS3StorageSelected(),
        isS3StorageConfigured: Boolean(
            endpoint && bucket && accessKeyId && isSecretAccessKeyConfigured && publicUrl,
        ),
        endpoint,
        bucket,
        region: readOptionalEnvironmentValue(process.env.CDN_REGION),
        pathPrefix: readOptionalEnvironmentValue(process.env.NEXT_PUBLIC_CDN_PATH_PREFIX),
        publicUrl,
        isForcePathStyleEnabled: process.env.CDN_FORCE_PATH_STYLE === 'true',
        accessKeyId,
        isSecretAccessKeyConfigured,
        dataDirectory: readOptionalEnvironmentValue(process.env.PTBK_SELF_CONTAINED_S3_DIRECTORY),
        serviceName: readOptionalEnvironmentValue(process.env.PTBK_SELF_CONTAINED_S3_SERVICE_NAME),
        port: readOptionalEnvironmentValue(process.env.PTBK_SELF_CONTAINED_S3_PORT),
    };
}
