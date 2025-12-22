import { $getTableName } from '@/src/database/$getTableName';
import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import type { LlmExecutionTools } from '../../../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import { string_url } from '../../../../../../../src/types/typeAliases';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { $provideCdnForServer } from '../../../../tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '../../../../tools/$provideExecutionToolsForServer';
import { filenameToPrompt } from '../../../../utils/normalization/filenameToPrompt';

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const searchParams = request.nextUrl.searchParams;
        const modelName = searchParams.get('modelName');
        const isRaw = searchParams.get('raw') === 'true';

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        const supabase = $provideSupabaseForServer();

        // Check if image already exists in database
        const { data: existingImage, error: selectError } = await supabase
            .from(await $getTableName(`Image`))
            .select('cdnUrl')
            .eq('filename', filename)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116 is "not found"
            throw selectError;
        }

        if (existingImage) {
            if (isRaw) {
                return NextResponse.json({
                    source: 'cache',
                    filename,
                    cdnUrl: existingImage.cdnUrl,
                });
            }
            // Image exists, redirect to CDN
            return NextResponse.redirect(existingImage.cdnUrl as string_url);
        }

        // Image doesn't exist, generate it
        const prompt = filenameToPrompt(filename);

        const executionTools = await $provideExecutionToolsForServer();
        const llmTools = getSingleLlmExecutionTools(executionTools.llm) as LlmExecutionTools;

        if (!llmTools.callImageGenerationModel) {
            throw new Error('Image generation is not supported by the current LLM configuration');
        }

        const imageResult = await llmTools.callImageGenerationModel({
            title: `Generate image for ${filename}`,
            content: prompt,
            parameters: {},
            modelRequirements: {
                modelVariant: 'IMAGE_GENERATION',
                modelName: modelName || 'dall-e-3', // Use DALL-E 3 for high quality
            },
        });

        if (!imageResult.content) {
            throw new Error('Failed to generate image: no content returned');
        }

        // Download the generated image
        const imageResponse = await fetch(imageResult.content);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download generated image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);

        // Upload to CDN
        const cdn = $provideCdnForServer();
        const cdnKey = `generated-images/${filename}`;
        await cdn.setItem(cdnKey, {
            type: 'image/png', // DALL-E generates PNG
            data: buffer,
        });

        const cdnUrl = cdn.getItemUrl(cdnKey);

        // Save to database
        const { error: insertError } = await supabase.from(await $getTableName(`Image`)).insert({
            filename,
            prompt,
            cdnUrl: cdnUrl.href,
            cdnKey,
        });

        if (insertError) {
            throw insertError;
        }

        if (isRaw) {
            return NextResponse.json({
                source: 'generated',
                filename,
                prompt,
                modelName: modelName || 'dall-e-3',
                cdnUrl: cdnUrl.href,
                imageResult,
            });
        }

        // Redirect to the newly created image
        return NextResponse.redirect(cdnUrl.href as string_url);
    } catch (error) {
        assertsError(error);

        console.error('Error serving image:', error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
