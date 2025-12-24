import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
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
        const inner = new VercelBlobStorage({
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX!,
            cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
        });

        const supabase = $provideSupabaseForServer();
        cdn = new TrackedFilesStorage(inner, supabase);

        /*
        cdn = new DigitalOceanSpaces({
            bucket: process.env.CDN_BUCKET!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX!,
            endpoint: process.env.CDN_ENDPOINT!,
            accessKeyId: process.env.CDN_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
            cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
            gzip: true,
        });
        */
    }

    return cdn;
}
