import { getMetadata } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { computeAgentHash, parseAgentSource } from '@promptbook-local/core';
import { AgentBasicInformation, AgentCapability } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveTeamCapabilitiesFromAgentSource } from '@/src/utils/agentReferenceResolver/resolveTeamCapabilitiesFromAgentSource';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';

/**
 * Inherits meta properties from parent agents recursively
 *
 * @param agentProfile - The current agent profile
 * @param collection - The agent collection to fetch parent agents from
 * @param visitedAgentNames - Set of already visited agent names to prevent infinite loops
 * @returns The agent profile with inherited meta properties
 */
async function inheritMeta(
    agentProfile: AgentBasicInformation,
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>,
    visitedAgentNames: Set<string> = new Set(),
): Promise<AgentBasicInformation> {
    const inheritanceCapability = agentProfile.capabilities.find(
        (capability: AgentCapability) => capability.type === 'inheritance',
    );

    if (!inheritanceCapability || !inheritanceCapability.agentUrl) {
        return agentProfile;
    }

    const parentAgentName = inheritanceCapability.agentUrl;

    if (visitedAgentNames.has(parentAgentName)) {
        console.warn(`Circular inheritance detected for agent "${parentAgentName}"`);
        return agentProfile;
    }

    visitedAgentNames.add(parentAgentName);

    try {
        const parentAgentSource = await collection.getAgentSource(parentAgentName);
        let parentAgentProfile = parseAgentSource(parentAgentSource);

        // Recursively inherit from parent's parent
        parentAgentProfile = await inheritMeta(parentAgentProfile, collection, visitedAgentNames);

        // Inherit missing meta properties
        for (const [key, value] of Object.entries(parentAgentProfile.meta)) {
            if (agentProfile.meta[key] === undefined) {
                agentProfile.meta[key] = value;
            }
        }

        // Inherit persona description if missing
        if (!agentProfile.personaDescription) {
            agentProfile.personaDescription = parentAgentProfile.personaDescription;
        }

        // Inherit initial message if missing
        if (!agentProfile.initialMessage) {
            agentProfile.initialMessage = parentAgentProfile.initialMessage;
        }

        // Inherit knowledge sources if missing (for citation resolution)
        if (!agentProfile.knowledgeSources || agentProfile.knowledgeSources.length === 0) {
            agentProfile.knowledgeSources = parentAgentProfile.knowledgeSources || [];
        }
    } catch (error) {
        console.error(`Failed to inherit from parent agent "${parentAgentName}":`, error);
    }

    return agentProfile;
}

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
        let agentProfile = parseAgentSource(agentSource);
        const agentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedTeamCapabilities = await resolveTeamCapabilitiesFromAgentSource(agentSource, agentReferenceResolver);

        agentProfile = await inheritMeta(agentProfile, collection, new Set([agentName]));
        agentProfile.capabilities = mergeTeamCapabilities(agentProfile.capabilities, resolvedTeamCapabilities);

        const agentHash = computeAgentHash(agentSource);
        const isVoiceCallingEnabled = (await getMetadata('IS_EXPERIMENTAL_VOICE_CALLING_ENABLED')) === 'true';

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
 * TODO: !!!! maybe use standard resolve inheritance
 */
