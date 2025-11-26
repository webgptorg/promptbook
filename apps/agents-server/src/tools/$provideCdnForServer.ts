import { DigitalOceanSpaces } from '../utils/cdn/classes/DigitalOceanSpaces';
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
        cdn = new DigitalOceanSpaces({
            bucket: process.env.CDN_BUCKET!,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX!,
            endpoint: process.env.CDN_ENDPOINT!,
            accessKeyId: process.env.CDN_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY!,
            cdnPublicUrl: new URL(process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!),
            gzip: true,
        });
    }

    return cdn;
}
