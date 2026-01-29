// Dynamic sitemap.xml for Agents Server

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { spaceTrim } from '@promptbook-local/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { publicUrl } = await $provideServer();

    const collection = await $provideAgentCollectionForServer();

    // Assume collection.listAgents() returns an array of agent names
    const agents = await collection.listAgents();

    const urls = agents
        .map(
            ({ permanentId, agentName }) =>
                `<url><loc>${publicUrl.href}agents/${encodeURIComponent(permanentId || agentName)}</loc></url>`,
        )
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
