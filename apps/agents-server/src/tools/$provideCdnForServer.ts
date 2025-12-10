import { VercelBlobStorage } from '../utils/cdn/classes/VercelBlobStorage';
import { IIFilesStorageWithCdn } from '../utils/cdn/interfaces/IFilesStorage';

/**
 * Cache of CDN instance
 *
 * @private internal cache for `$provideCdnForServer`
 */
let cdn: IIFilesStorageWithCdn | null = null;

/**
 * [🐱‍🚀]
 */
export function $provideCdnForServer(): IIFilesStorageWithCdn {
    if (!cdn) {
        cdn = new VercelBlobStorage({
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX!,
            cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
        });
    }

    return cdn;
}
