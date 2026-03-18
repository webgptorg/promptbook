import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../../src/utils/organization/keepUnused';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '@/src/utils/agentReferenceResolver/AgentReferenceResolutionIssue';
import { createInlineKnowledgeSourceUploader } from '@/src/utils/knowledge/createInlineKnowledgeSourceUploader';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';

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
        const agentReferenceResolver = resolvedAgentContext.scopedAgentReferenceResolver;
        const modelRequirements = await createAgentModelRequirements(
            agentSource,
            undefined,
            undefined,
            undefined,
            {
                agentReferenceResolver,
                inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
            },
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
