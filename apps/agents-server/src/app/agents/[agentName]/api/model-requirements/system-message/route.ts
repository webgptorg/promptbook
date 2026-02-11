import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../../src/utils/organization/keepUnused';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '@/src/utils/agentReferenceResolver/AgentReferenceResolutionIssue';

export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    keepUnused(request /* <- Note: We dont need `request` parameter */);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agentReferenceResolver = await $provideAgentReferenceResolver();
        const effectiveAgentSource = await resolveInheritedAgentSource(agentSource, {
            adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
            agentReferenceResolver,
        });
        const modelRequirements = await createAgentModelRequirements(
            effectiveAgentSource,
            undefined,
            undefined,
            undefined,
            { agentReferenceResolver },
        );
        const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(agentReferenceResolver);
        if (unresolvedAgentReferences.length > 0) {
            console.warn('[system-message API] Unresolved agent references detected:', unresolvedAgentReferences);
        }
        const { systemMessage } = modelRequirements;

        return new Response(systemMessage, {
            status: 200,
            headers: { 'Content-Type': 'text/markdown' },
        });
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
