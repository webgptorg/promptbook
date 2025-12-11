// Dynamic sitemap.xml for Agents Server

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { spaceTrim } from '@promptbook-local/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const collection = await $provideAgentCollectionForServer();

    // Assume collection.listAgents() returns an array of agent names
    const agentNames = await collection.listAgents();

    // Get base URL from environment or config
    const baseUrl = process.env.PUBLIC_URL || 'https://your-agents-server-domain.com';

    const urls = agentNames
        .map(({ agentName }) => `<url><loc>${baseUrl}/agents/${encodeURIComponent(agentName)}</loc></url>`)
        .join('\n');

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
        },
    });
}
