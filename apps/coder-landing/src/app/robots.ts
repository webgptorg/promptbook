import { resolveSiteUrl, SITE_URL } from '@/data/siteMetadata';
import type { MetadataRoute } from 'next';

/**
 * Builds `/robots.txt` which invites every crawler to the whole page and points it to the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
            },
        ],
        sitemap: resolveSiteUrl('/sitemap.xml'),
        host: SITE_URL,
    };
}
