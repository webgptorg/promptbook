import { getMetadataMap } from '@/src/database/getMetadata';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    resolveDefaultAgentAvatarVisualId,
} from '@/src/constants/defaultAgentAvatarVisual';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { computeAgentHash } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';

/**
 * Handles options.
 */
export async function OPTIONS(request: Request) {
    keepUnused(request);
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

/**
 * Handles get.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveServerAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl: new URL(request.url).origin,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const agentSource = resolvedAgentContext.resolvedAgentSource;
        const agentProfile = { ...resolvedAgentContext.resolvedAgentProfile };

        const metadata = await getMetadataMap([
            'IS_EXPERIMENTAL_VOICE_CALLING_ENABLED',
            'IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED',
            DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
        ]);
        const agentHash = computeAgentHash(agentSource);
        const isVoiceCallingEnabled = metadata.IS_EXPERIMENTAL_VOICE_CALLING_ENABLED === 'true';
        const isVoiceTtsSttEnabled = metadata.IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED === 'true';
        const isMetaImageExplicit = Boolean(agentProfile.meta.image);
        const defaultAgentAvatarVisualId = resolveDefaultAgentAvatarVisualId(
            metadata[DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY],
        );
        const defaultAvatarImageUrl =
            !isMetaImageExplicit && !resolvedAgentContext.isBookScopedAgent
                ? `/agents/${encodeURIComponent(agentName)}/images/default-avatar.png`
                : undefined;

        if (defaultAvatarImageUrl) {
            agentProfile.meta.image = defaultAvatarImageUrl;
        }

        return new Response(
            JSON.stringify(
                {
                    ...agentProfile,
                    agentHash,
                    parameters: [], // <- TODO: [😰] Implement parameters
                    isVoiceCallingEnabled, // [✨✷] Add voice calling status
                    isVoiceTtsSttEnabled, // [✨✷] Add TTS/STT availability
                    toolTitles: agentProfile.meta.toolTitles || {}, // <- [🧠] Should we have this in meta?
                    knowledgeSources: agentProfile.knowledgeSources || [], // <- [📚] Explicitly include knowledge sources for citation resolution
                    isMetaImageExplicit,
                    avatarVisualId: isMetaImageExplicit ? undefined : defaultAgentAvatarVisualId,
                },
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // <- Note: Allow embedding on other websites
                },
            },
        );
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}

// TODO: [🍞] DRY - Make some common utility for API on one agent
