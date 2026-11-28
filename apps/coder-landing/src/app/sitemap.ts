import { SITE_URL } from '@/data/siteMetadata';
import type { MetadataRoute } from 'next';

/**
 * Builds `/sitemap.xml` which tells search engines about every page of the site.
 *
 * Note: The whole landing page is one single route, its sections are only anchors inside it,
 *       see [`specs/page-structure.md`](../../specs/page-structure.md)
 */
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
    ];
}
