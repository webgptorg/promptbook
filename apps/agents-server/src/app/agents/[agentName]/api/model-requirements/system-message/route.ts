import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';
import { getCurrentUser } from '@/src/utils/getCurrentUser';

/**
 * Handles get.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        if (!(await getCurrentUser())) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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

// TODO: [🍞] DRY - Make some common utility for API on one agent
