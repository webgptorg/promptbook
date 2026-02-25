// Dynamic sitemap.xml for Agents Server

import { $provideServer } from '@/src/tools/$provideServer';
import { getPublicAgentProfileSeoRecords } from '@/src/utils/seo/getPublicAgentProfileSeoRecords';
import { spaceTrim } from '@promptbook-local/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { publicUrl } = await $provideServer();
    const publicAgents = await getPublicAgentProfileSeoRecords();

    const urls = publicAgents
        .map(({ canonicalAgentId, lastModifiedAt }) => {
            const profileUrl = `${publicUrl.href}agents/${encodeURIComponent(canonicalAgentId)}`;
            return `<url><loc>${profileUrl}</loc><lastmod>${lastModifiedAt}</lastmod></url>`;
        })
        .join('');

    const xml = spaceTrim(
        (block) => `
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                ${block(urls)}
            </urlset>
        `,
    );

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
