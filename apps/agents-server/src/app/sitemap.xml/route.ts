// Dynamic sitemap.xml for Agents Server

import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import {
    countPublicAgentProfileSeoRecords,
    DEFAULT_SITEMAP_PAGE_SIZE,
    getPublicAgentProfileSeoRecordsPage,
    type PublicAgentProfileSeoRecord,
} from '@/src/utils/seo/getPublicAgentProfileSeoRecords';
import { isPublicServerVisibility } from '@/src/utils/serverVisibility';
import { NextRequest, NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';

/**
 * Constant for dynamic.
 */
export const dynamic = 'force-dynamic';

/**
 * Builds XML sitemap URL records for one page of public agents.
 *
 * @param options - Public base URL and current page records.
 * @returns XML `<urlset>` document.
 */
function createSitemapUrlSetXml(options: {
    publicUrl: URL;
    records: ReadonlyArray<PublicAgentProfileSeoRecord>;
}): string {
    const urls = options.records
        .map(({ canonicalAgentId, lastModifiedAt }) => {
            const profileUrl = `${options.publicUrl.href}agents/${encodeURIComponent(canonicalAgentId)}`;
            return `<url><loc>${profileUrl}</loc><lastmod>${lastModifiedAt}</lastmod></url>`;
        })
        .join('');

    return spaceTrim(
        (block) => `
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                ${block(urls)}
            </urlset>
        `,
    );
}

/**
 * Builds XML sitemap index for paginated sitemap pages.
 *
 * @param options - Public base URL and number of sitemap pages.
 * @returns XML `<sitemapindex>` document.
 */
function createSitemapIndexXml(options: { publicUrl: URL; totalPages: number }): string {
    const sitemapEntries = Array.from({ length: options.totalPages }, (_, index) => index + 1)
        .map((page) => `<sitemap><loc>${options.publicUrl.href}sitemap.xml?page=${page}</loc></sitemap>`)
        .join('');

    return spaceTrim(
        (block) => `
            <?xml version="1.0" encoding="UTF-8"?>
            <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                ${block(sitemapEntries)}
            </sitemapindex>
        `,
    );
}

/**
 * Parses optional sitemap page query parameter.
 *
 * @param request - Incoming sitemap request.
 * @returns Parsed page number or `null` when not provided.
 */
function parsePageParameter(request: NextRequest): number | null {
    const rawPage = request.nextUrl.searchParams.get('page');
    if (rawPage === null) {
        return null;
    }

    const parsedPage = Number(rawPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return NaN;
    }

    return parsedPage;
}

/**
 * Creates one XML sitemap response with shared headers.
 *
 * @param xml - Sitemap XML body.
 * @returns Response with sitemap headers.
 */
function createSitemapXmlResponse(xml: string): NextResponse {
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
            'X-Robots-Tag': 'index, follow',
        },
    });
}

/**
 * Handles get.
 */
export async function GET(request: NextRequest) {
    const [{ publicUrl }, serverVisibility] = await Promise.all([$provideServer(), getServerVisibility()]);
    if (!isPublicServerVisibility(serverVisibility)) {
        return new NextResponse('Not Found', {
            status: 404,
            headers: {
                'X-Robots-Tag': 'noindex, nofollow',
            },
        });
    }

    const parsedPage = parsePageParameter(request);
    if (Number.isNaN(parsedPage)) {
        return new NextResponse('Invalid `page` query parameter.', {
            status: 400,
            headers: {
                'Content-Type': 'text/plain',
                'X-Robots-Tag': 'noindex, nofollow',
            },
        });
    }

    const totalCount = await countPublicAgentProfileSeoRecords();
    const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_SITEMAP_PAGE_SIZE));

    if (parsedPage === null && totalPages > 1) {
        return createSitemapXmlResponse(createSitemapIndexXml({ publicUrl, totalPages }));
    }

    const page = parsedPage || 1;
    if (page > totalPages) {
        return new NextResponse('Not Found', {
            status: 404,
            headers: {
                'X-Robots-Tag': 'noindex, nofollow',
            },
        });
    }

    const records = await getPublicAgentProfileSeoRecordsPage({
        page,
        pageSize: DEFAULT_SITEMAP_PAGE_SIZE,
    });

    return createSitemapXmlResponse(createSitemapUrlSetXml({ publicUrl, records }));
}
