import { isSelfContainedS3StorageSelected, resolveCdnPublicUrlForServer } from './$provideCdnForServer';

const ORIGINAL_PTBK_FILE_STORAGE_MODE = process.env.PTBK_FILE_STORAGE_MODE;
const ORIGINAL_CDN_PROVIDER = process.env.CDN_PROVIDER;
const ORIGINAL_NEXT_PUBLIC_CDN_PUBLIC_URL = process.env.NEXT_PUBLIC_CDN_PUBLIC_URL;

describe('$provideCdnForServer', () => {
    afterEach(() => {
        restoreEnvironmentVariable('PTBK_FILE_STORAGE_MODE', ORIGINAL_PTBK_FILE_STORAGE_MODE);
        restoreEnvironmentVariable('CDN_PROVIDER', ORIGINAL_CDN_PROVIDER);
        restoreEnvironmentVariable('NEXT_PUBLIC_CDN_PUBLIC_URL', ORIGINAL_NEXT_PUBLIC_CDN_PUBLIC_URL);
    });

    it('keeps the configured CDN public URL for external storage', () => {
        process.env.PTBK_FILE_STORAGE_MODE = 'external-s3';
        process.env.NEXT_PUBLIC_CDN_PUBLIC_URL = 'https://cdn.example.com/promptbook-files';

        expect(resolveCdnPublicUrlForServer(new URL('https://s22.ptbk.io')).href).toBe(
            'https://cdn.example.com/promptbook-files',
        );
    });

    it('uses the active server origin for self-contained S3 while preserving the bucket path', () => {
        process.env.PTBK_FILE_STORAGE_MODE = 'self-contained-s3';
        process.env.NEXT_PUBLIC_CDN_PUBLIC_URL = 'http://167.172.138.126/s3/promptbook-files';

        expect(resolveCdnPublicUrlForServer(new URL('https://s22.ptbk.io')).href).toBe(
            'https://s22.ptbk.io/s3/promptbook-files',
        );
    });

    it('detects the self-contained S3 storage mode', () => {
        process.env.PTBK_FILE_STORAGE_MODE = 'self-contained-s3';
        process.env.CDN_PROVIDER = '';

        expect(isSelfContainedS3StorageSelected()).toBe(true);
    });
});

/**
 * Restores one optional environment variable after a test case.
 *
 * @param key - Environment variable key.
 * @param value - Original value snapshot.
 */
function restoreEnvironmentVariable(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
