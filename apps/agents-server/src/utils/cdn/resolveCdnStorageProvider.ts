/**
 * Supported file storage backends for Agents Server CDN uploads.
 *
 * @private internal CDN configuration helper.
 */
export type CdnStorageProvider = 's3' | 'vercel';

/**
 * Resolves the configured CDN storage provider.
 *
 * @private internal CDN configuration helper.
 */
export function resolveCdnStorageProvider(): CdnStorageProvider {
    const rawProvider = (process.env.NEXT_PUBLIC_CDN_STORAGE_PROVIDER || '').trim().toLowerCase();

    switch (rawProvider) {
        case 's3':
        case 'minio':
        case 'external-s3':
        case 'self-contained-s3':
            return 's3';

        case 'vercel':
        case 'vercel-blob':
        case '':
            return 'vercel';

        default:
            throw new Error(`Unsupported CDN storage provider \`${rawProvider}\`.`);
    }
}

/**
 * Checks whether browser uploads should be routed through the Agents Server API.
 *
 * @private internal CDN configuration helper.
 */
export function isServerRoutedCdnUploadProvider(provider: CdnStorageProvider = resolveCdnStorageProvider()): boolean {
    return provider === 's3';
}
