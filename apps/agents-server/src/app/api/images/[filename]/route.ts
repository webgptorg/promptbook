import { serializeError, computeHash } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import type { LlmExecutionTools } from '../../../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import type { ImageGenerationModelRequirements } from '../../../../../../../src/types/ModelRequirements';
import { string_url } from '../../../../../../../src/types/typeAliases';
import { $provideCdnForServer, resolveCdnPublicUrlForServer } from '../../../../tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '../../../../tools/$provideExecutionToolsForServer';
import { $provideServer } from '../../../../tools/$provideServer';
import { getGeneratedImageCdnKey } from '../../../../utils/cdn/utils/getGeneratedImageCdnKey';
import { ensureGeneratedImage } from '../../../../utils/imageGeneration/ensureGeneratedImage';
import { filenameToPrompt } from '../../../../utils/normalization/filenameToPrompt';
import { guardPaidApiRequest } from '../../../../utils/paidApiRequestGuard';

/**
 * Allowlist of image generation models that may be requested by the caller.
 *
 * Image generation is one of the most expensive paid AI operations, so we
 * reject any unknown model id before forwarding to the upstream provider.
 */
const ALLOWED_IMAGE_GENERATION_MODELS = new Set<string>([
    'dall-e-3',
    'dall-e-2',
    'gpt-image-1',
    'gemini-3-pro-image-preview',
    'gemini-2.0-flash-preview-image-generation',
]);

/**
 * Allowlist of image sizes accepted from the caller.
 *
 * Larger sizes cost more on every supported provider, so callers must pick a
 * value from this fixed list instead of supplying arbitrary `${number}x${number}`
 * strings.
 */
const ALLOWED_IMAGE_GENERATION_SIZES = new Set<NonNullable<ImageGenerationModelRequirements['size']>>([
    '1024x1024',
    '1792x1024',
    '1024x1792',
]);

/**
 * Allowlist of image quality values accepted from the caller.
 */
const ALLOWED_IMAGE_GENERATION_QUALITIES = new Set<NonNullable<ImageGenerationModelRequirements['quality']>>([
    'standard',
    'hd',
]);

/**
 * Allowlist of image style values accepted from the caller.
 */
const ALLOWED_IMAGE_GENERATION_STYLES = new Set<NonNullable<ImageGenerationModelRequirements['style']>>([
    'vivid',
    'natural',
]);

/**
 * Chooses default image model from current provider metadata.
 */
function resolveDefaultImageModelName(llmTools: LlmExecutionTools): string {
    return llmTools.title.includes('Google') ? 'gemini-3-pro-image-preview' : 'dall-e-3';
}

/**
 * Handles get.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const searchParams = request.nextUrl.searchParams;
        const modelName = searchParams.get('modelName');
        const size = searchParams.get('size');
        const quality = searchParams.get('quality');
        const style = searchParams.get('style');
        const attachmentsRaw = searchParams.get('attachments');
        const isRaw = searchParams.get('raw') === 'true';

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        const guard = await guardPaidApiRequest(request, 'IMAGE_GENERATION');
        if (!guard.ok) {
            return guard.response;
        }

        if (modelName !== null && !ALLOWED_IMAGE_GENERATION_MODELS.has(modelName)) {
            return NextResponse.json(
                {
                    error: spaceTrim(`
                        Requested image generation \`modelName\` is not allowed.

                        **Allowed models:** ${Array.from(ALLOWED_IMAGE_GENERATION_MODELS).join(', ')}
                    `),
                },
                { status: 400 },
            );
        }

        if (size !== null && !ALLOWED_IMAGE_GENERATION_SIZES.has(size as never)) {
            return NextResponse.json(
                {
                    error: spaceTrim(`
                        Requested image \`size\` is not allowed.

                        **Allowed sizes:** ${Array.from(ALLOWED_IMAGE_GENERATION_SIZES).join(', ')}
                    `),
                },
                { status: 400 },
            );
        }

        if (quality !== null && !ALLOWED_IMAGE_GENERATION_QUALITIES.has(quality as never)) {
            return NextResponse.json(
                {
                    error: spaceTrim(`
                        Requested image \`quality\` is not allowed.

                        **Allowed values:** ${Array.from(ALLOWED_IMAGE_GENERATION_QUALITIES).join(', ')}
                    `),
                },
                { status: 400 },
            );
        }

        if (style !== null && !ALLOWED_IMAGE_GENERATION_STYLES.has(style as never)) {
            return NextResponse.json(
                {
                    error: spaceTrim(`
                        Requested image \`style\` is not allowed.

                        **Allowed values:** ${Array.from(ALLOWED_IMAGE_GENERATION_STYLES).join(', ')}
                    `),
                },
                { status: 400 },
            );
        }

        let attachments: unknown[] | undefined;
        if (attachmentsRaw) {
            try {
                attachments = JSON.parse(attachmentsRaw) as unknown[];
            } catch {
                return NextResponse.json({ error: 'Invalid attachments parameter' }, { status: 400 });
            }
        }

        const prompt = filenameToPrompt(filename);
        const executionTools = await $provideExecutionToolsForServer();
        const providedServer = await $provideServer();
        const llmTools = getSingleLlmExecutionTools(executionTools.llm) as LlmExecutionTools;

        if (!llmTools.callImageGenerationModel) {
            throw new Error('Image generation is not supported by the current LLM configuration');
        }

        const resolvedModelName = modelName || resolveDefaultImageModelName(llmTools);
        let generatedImageResult: Awaited<ReturnType<NonNullable<LlmExecutionTools['callImageGenerationModel']>>> | null =
            null;
        const imageRecord = await ensureGeneratedImage({
            filename,
            prompt,
            lockKey: `image-${computeHash(filename)}`,
            createImage: async () => {
                const imageResult = await llmTools.callImageGenerationModel!({
                    title: `Generate image for ${filename}`,
                    content: prompt,
                    parameters: {},
                    attachments: attachments as never,
                    modelRequirements: {
                        modelVariant: 'IMAGE_GENERATION',
                        modelName: resolvedModelName,
                        size: (size as ImageGenerationModelRequirements['size']) || undefined,
                        quality: (quality as ImageGenerationModelRequirements['quality']) || undefined,
                        style: (style as ImageGenerationModelRequirements['style']) || undefined,
                    },
                });

                if (!imageResult.content) {
                    throw new Error('Failed to generate image: no content returned');
                }

                generatedImageResult = imageResult;

                const imageResponse = await fetch(imageResult.content);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to download generated image: ${imageResponse.status}`);
                }

                const imageBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(imageBuffer);

                const cdn = $provideCdnForServer({
                    cdnPublicUrl: resolveCdnPublicUrlForServer(providedServer.publicUrl),
                });
                const cdnKey = getGeneratedImageCdnKey({ filename, pathPrefix: cdn.pathPrefix });
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

        if (isRaw) {
            return NextResponse.json({
                source: imageRecord.source,
                filename,
                prompt: imageRecord.prompt,
                modelName: resolvedModelName,
                size,
                quality,
                style,
                cdnUrl: imageRecord.cdnUrl,
                imageResult: generatedImageResult || undefined,
            });
        }

        return NextResponse.redirect(imageRecord.cdnUrl as string_url);
    } catch (error) {
        assertsError(error);

        console.error('Error serving image:', error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
