import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import type { string_url } from '../../../../../../../../src/types/typeAliases';
import { prepareAgentDefaultAvatarMaterialization } from '../../../../../utils/imageGeneration/prepareAgentDefaultAvatarMaterialization';

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        let { agentName } = await params;
        agentName = decodeURIComponent(agentName);

        if (!agentName) {
            return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
        }

        // 1. Fetch agent data first to construct the prompt
        const collection = await $provideAgentCollectionForServer();
        let agentSource;
        try {
            agentSource = await collection.getAgentSource(agentName);
        } catch (error) {
            assertsError(error);

            return NextResponse.json({ error: serializeError(error) }, { status: 500 });

            //> // If agent not found, redirect to pravatar with the agent name as unique identifier
            //> const pravaratUrl = `https://i.pravatar.cc/1024?u=${encodeURIComponent(agentName)}`;
            //> return NextResponse.redirect(pravaratUrl);
        }

        const imageRecord = await (await prepareAgentDefaultAvatarMaterialization(agentSource)).finalize();

        const imageResponse = await fetch(imageRecord.imageUrl as string_url);
        if (!imageResponse.ok) {
            console.warn(`Failed to fetch image from CDN: ${imageResponse.status}`);
            return NextResponse.redirect(imageRecord.imageUrl);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        assertsError(error);
        console.error('Error serving default avatar:', error);
        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
