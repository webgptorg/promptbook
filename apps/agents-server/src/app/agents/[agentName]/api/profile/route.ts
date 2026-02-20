import { getMetadataMap } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveTeamCapabilitiesFromAgentSource } from '@/src/utils/agentReferenceResolver/resolveTeamCapabilitiesFromAgentSource';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveAgentProfileWithInheritance } from '@/src/utils/resolveAgentProfileWithInheritance';
import { computeAgentHash } from '@promptbook-local/core';
import { AgentCapability } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';

/**
 * Replaces TEAM capabilities with resolver-backed entries while preserving capability order.
 *
 * @param capabilities - Original capability list parsed from agent source.
 * @param resolvedTeamCapabilities - TEAM capabilities resolved with compact references expanded.
 * @returns Capability list with TEAM entries replaced by resolved values.
 */
function mergeTeamCapabilities(
    capabilities: ReadonlyArray<AgentCapability>,
    resolvedTeamCapabilities: ReadonlyArray<AgentCapability>,
): Array<AgentCapability> {
    if (resolvedTeamCapabilities.length === 0) {
        return [...capabilities];
    }

    const mergedCapabilities: Array<AgentCapability> = [];
    let hasInsertedResolvedTeams = false;

    for (const capability of capabilities) {
        if (capability.type === 'team') {
            if (!hasInsertedResolvedTeams) {
                mergedCapabilities.push(...resolvedTeamCapabilities);
                hasInsertedResolvedTeams = true;
            }
            continue;
        }

        mergedCapabilities.push(capability);
    }

    if (!hasInsertedResolvedTeams) {
        mergedCapabilities.push(...resolvedTeamCapabilities);
    }

    return mergedCapabilities;
}

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

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agentReferenceResolver = await $provideAgentReferenceResolver();
        const adamAgentUrl = await getWellKnownAgentUrl('ADAM');
        const agentProfile = await resolveAgentProfileWithInheritance(agentSource, {
            adamAgentUrl,
            agentReferenceResolver,
        });
        const resolvedTeamCapabilities = await resolveTeamCapabilitiesFromAgentSource(agentSource, agentReferenceResolver);

        agentProfile.capabilities = mergeTeamCapabilities(agentProfile.capabilities, resolvedTeamCapabilities);

        const metadata = await getMetadataMap([
            'IS_EXPERIMENTAL_VOICE_CALLING_ENABLED',
            'IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED',
        ]);
        const agentHash = computeAgentHash(agentSource);
        const isVoiceCallingEnabled = metadata.IS_EXPERIMENTAL_VOICE_CALLING_ENABLED === 'true';
        const isVoiceTtsSttEnabled = metadata.IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED === 'true';

        if (!agentProfile.meta.image) {
            agentProfile.meta.image = `/agents/${encodeURIComponent(agentName)}/images/default-avatar.png`;
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

/**
 * TODO: [🍞] DRY - Make some common utility for API on one agent
 */
