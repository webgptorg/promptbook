import { getMetadataMap } from '@/src/database/getMetadata';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    resolveDefaultAgentAvatarVisualId,
} from '@/src/constants/defaultAgentAvatarVisual';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideCdnForServer, resolveCdnPublicUrlForServer } from '@/src/tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { computeHash, serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import type { LlmExecutionTools } from '../../../../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import type { string_url } from '../../../../../../../../src/types/typeAliases';
import { resolveAgentAvatarVisualId } from '../../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { getGeneratedImageCdnKey } from '../../../../../utils/cdn/utils/getGeneratedImageCdnKey';
import { ensureGeneratedImage } from '../../../../../utils/imageGeneration/ensureGeneratedImage';
import { renderAgentAvatarVisualPng } from '../../../../../utils/agentAvatars/renderAgentAvatarVisualPng';
import { getAgentDefaultAvatarPrompt } from './getAgentDefaultAvatarPrompt';

/**
 * Default raster size used for generated avatar PNG responses.
 *
 * @private route constant
 */
const DEFAULT_AGENT_AVATAR_IMAGE_SIZE = 1024;

/**
 * Explicit query mode that preserves the legacy AI-generated default-avatar flow.
 *
 * @private route constant
 */
const GENERATED_AGENT_AVATAR_MODE = 'generated';

/**
 * Cache policy for default avatars.
 *
 * The response is deterministic but tied to the current agent source, so we allow caching while still requiring revalidation.
 *
 * @private route constant
 */
const DEFAULT_AGENT_AVATAR_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/**
 * Resolves the agent profile used to render the default avatar.
 *
 * @private route helper
 */
async function resolveAgentProfileForDefaultAvatar(request: NextRequest, agentName: string) {
    const collection = await $provideAgentCollectionForServer();
    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl: new URL(request.url).origin,
        fallbackResolver: baseAgentReferenceResolver,
    });

    return resolvedAgentContext.resolvedAgentProfile;
}

/**
 * Preserves the previous AI-generated default-avatar implementation behind an explicit opt-in mode.
 *
 * @private route helper
 */
async function renderGeneratedDefaultAvatar(
    agentName: string,
    agentProfile: Awaited<ReturnType<typeof resolveAgentProfileForDefaultAvatar>>,
) {
    const prompt = getAgentDefaultAvatarPrompt(agentProfile);
    const providedServer = await $provideServer();

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
                    modelName: 'dall-e-3', // <- [🕕]
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
            const cdn = $provideCdnForServer({
                cdnPublicUrl: resolveCdnPublicUrlForServer(providedServer.publicUrl),
            });
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
            'Cache-Control': DEFAULT_AGENT_AVATAR_CACHE_CONTROL,
            ETag: `"${promptHash}"`,
        },
    });
}

/**
 * Handles get.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        let { agentName } = await params;
        agentName = decodeURIComponent(agentName);

        if (!agentName) {
            return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
        }

        let agentProfile;
        try {
            agentProfile = await resolveAgentProfileForDefaultAvatar(request, agentName);
        } catch (error) {
            assertsError(error);

            return NextResponse.json({ error: serializeError(error) }, { status: 500 });
        }

        if (request.nextUrl.searchParams.get('mode') === GENERATED_AGENT_AVATAR_MODE) {
            return renderGeneratedDefaultAvatar(agentName, agentProfile);
        }

        const metadata = await getMetadataMap([DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY]);
        const defaultAgentAvatarVisualId = resolveDefaultAgentAvatarVisualId(
            metadata[DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY],
        );
        const agentAvatarVisualId = resolveAgentAvatarVisualId(agentProfile, defaultAgentAvatarVisualId);
        const imageBuffer = renderAgentAvatarVisualPng(agentProfile, {
            size: DEFAULT_AGENT_AVATAR_IMAGE_SIZE,
            visualId: agentAvatarVisualId,
        });
        const avatarHash = computeHash(
            JSON.stringify({
                agentHash: agentProfile.agentHash,
                color: agentProfile.meta.color || '',
                image: agentProfile.meta.image || '',
                visualId: agentAvatarVisualId,
            }),
        );

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': DEFAULT_AGENT_AVATAR_CACHE_CONTROL,
                ETag: `"${avatarHash}"`,
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
