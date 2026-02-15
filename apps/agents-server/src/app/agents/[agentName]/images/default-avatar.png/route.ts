import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideCdnForServer } from '@/src/tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { parseAgentSource } from '@promptbook-local/core';
import { computeHash, serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import type { LlmExecutionTools } from '../../../../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import type { string_url } from '../../../../../../../../src/types/typeAliases';
import { getGeneratedImageCdnKey } from '../../../../../utils/cdn/utils/getGeneratedImageCdnKey';
import { ensureGeneratedImage } from '../../../../../utils/imageGeneration/ensureGeneratedImage';
import { getAgentDefaultAvatarPrompt } from './getAgentDefaultAvatarPrompt';

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

        const agentProfile = parseAgentSource(agentSource);

        const prompt = getAgentDefaultAvatarPrompt(agentProfile);

        // Use hash of the prompt as cache key - this ensures regeneration when prompt changes
        const promptHash = computeHash(prompt);
        const internalFilename = `agent-avatar-${promptHash}.png`;
        const lockKey = `agent-avatar-${promptHash}`;
        const imageRecord = await ensureGeneratedImage({
            filename: internalFilename,
            prompt,
            lockKey,
            createImage: async () => {
                const executionTools = await $provideExecutionToolsForServer();
                const llmTools = getSingleLlmExecutionTools(executionTools.llm) as LlmExecutionTools;

                if (!llmTools.callImageGenerationModel) {
                    throw new Error('Image generation is not supported by the current LLM configuration');
                }

                const imageResult = await llmTools.callImageGenerationModel({
                    title: `Generate default avatar for ${agentName}`,
                    content: prompt,
                    parameters: {},
                    modelRequirements: {
                        modelVariant: 'IMAGE_GENERATION',
                        modelName: 'gemini-3-pro-image-preview', // <- [🕕]
                        size: '1024x1792', // <- Vertical orientation
                        quality: 'hd',
                        style: 'natural',
                    },
                });

                if (!imageResult.content) {
                    throw new Error('Failed to generate image: no content returned');
                }

                const imageResponse = await fetch(imageResult.content);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to download generated image: ${imageResponse.status}`);
                }

                const imageBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(imageBuffer);
                const cdn = $provideCdnForServer();
                const cdnKey = getGeneratedImageCdnKey({
                    filename: internalFilename,
                    pathPrefix: cdn.pathPrefix,
                });
                await cdn.setItem(cdnKey, {
                    type: 'image/png',
                    data: buffer,
                });

                const cdnUrl = cdn.getItemUrl(cdnKey);
                return {
                    cdnUrl: cdnUrl.href,
                    cdnKey,
                };
            },
        });

        const imageResponse = await fetch(imageRecord.cdnUrl as string_url);
        if (!imageResponse.ok) {
            console.warn(`Failed to fetch image from CDN: ${imageResponse.status}`);
            return NextResponse.redirect(imageRecord.cdnUrl);
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
