import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideCdnForServer } from '@/src/tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { parseAgentSource } from '@promptbook-local/core';
import { computeHash, serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import type { LlmExecutionTools } from '../../../../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import type { string_url } from '../../../../../../../../src/types/typeAliases';

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
            // If agent not found, return 404 or default generic image?
            // User said: "Use the ... instead of Gravatar for agents that do not have custom uploaded avatar"
            // If agent doesn't exist, we probably can't generate a specific avatar.
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agentProfile = parseAgentSource(agentSource);

        // Extract required fields
        const name = agentProfile.meta?.title || agentProfile.agentName || agentName;
        const persona = agentProfile.personaDescription || 'an AI agent';
        const color = agentProfile.meta?.color || 'blue';

        // Construct prompt
        // "Image of {agent.name}, {agent.persona}, portrait, use color ${agent.meta.color}, detailed, high quality"
        const prompt = spaceTrim(
            (block) => `
                Image of ${name}
                
                ${block(persona)}
                
                - Portrait photograph
                - Photorealistic portrait
                - Use color ${color}
                - Detailed, high quality
                
            `,
        );

        // Use hash of the prompt as cache key - this ensures regeneration when prompt changes
        const promptHash = computeHash(prompt);
        const internalFilename = `agent-avatar-${promptHash}.png`;

        const supabase = $provideSupabaseForServer();

        // Check if image with this prompt hash already exists in database
        const { data: existingImage, error: selectError } = await supabase
            .from(await $getTableName(`Image`))
            .select('cdnUrl')
            .eq('filename', internalFilename)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116 is "not found"
            throw selectError;
        }

        if (existingImage) {
            // Image exists, redirect to CDN
            return NextResponse.redirect(existingImage.cdnUrl as string_url);
        }

        // Image doesn't exist, generate it

        // 2. Generate image
        const executionTools = await $provideExecutionToolsForServer();
        const llmTools = getSingleLlmExecutionTools(executionTools.llm) as LlmExecutionTools;

        if (!llmTools.callImageGenerationModel) {
            throw new Error('Image generation is not supported by the current LLM configuration');
        }

        const imageResult = await llmTools.callImageGenerationModel({
            title: `Generate default avatar for ${agentName}`,
            content: prompt,
            parameters: {
                size: '1024x1792', // Vertical orientation
            },
            modelRequirements: {
                modelVariant: 'IMAGE_GENERATION',
                modelName: 'dall-e-3',
            },
        });

        if (!imageResult.content) {
            throw new Error('Failed to generate image: no content returned');
        }

        // 3. Download and Upload to CDN
        const imageResponse = await fetch(imageResult.content);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download generated image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);

        const cdn = $provideCdnForServer();
        const cdnKey = `generated-images/${internalFilename}`;
        await cdn.setItem(cdnKey, {
            type: 'image/png',
            data: buffer,
        });

        const cdnUrl = cdn.getItemUrl(cdnKey);

        // 4. Save to database
        const { error: insertError } = await supabase.from(await $getTableName(`Image`)).insert({
            filename: internalFilename,
            prompt,
            cdnUrl: cdnUrl.href,
            cdnKey,
        });

        if (insertError) {
            // Use upsert or handle race condition if needed, but insert is fine for now
            // If parallel requests happen, one might fail. We can ignore dup key error or retry.
            // But simple insert is what generic route does.
            throw insertError;
        }

        // Redirect to the newly created image
        return NextResponse.redirect(cdnUrl.href as string_url);
    } catch (error) {
        assertsError(error);
        console.error('Error serving default avatar:', error);
        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
