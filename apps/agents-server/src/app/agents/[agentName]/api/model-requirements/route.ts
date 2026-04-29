import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';

/**
 * Handles get.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const [collection, baseAgentReferenceResolver] = await Promise.all([
            $provideAgentCollectionForServer(),
            $provideAgentReferenceResolver(),
        ]);
        const localServerUrl = new URL(request.url).origin;
        const resolvedAgentContext = await resolveCachedServerAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const { modelRequirements, unresolvedAgentReferences } = await resolveCachedServerAgentModelRequirements({
            resolvedAgentContext,
            localServerUrl,
            fallbackResolver: baseAgentReferenceResolver,
        });
        if (unresolvedAgentReferences.length > 0) {
            console.warn('[model-requirements API] Unresolved agent references detected:', unresolvedAgentReferences);
        }
        const { _metadata, ...sanitizedModelRequirements } = modelRequirements;

        keepUnused(_metadata);

        return new Response(
            JSON.stringify(
                sanitizedModelRequirements,
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
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
