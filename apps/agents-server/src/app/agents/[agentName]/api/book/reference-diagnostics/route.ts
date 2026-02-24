import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { createBookScopedAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { createUnresolvedAgentReferenceDiagnostics } from '@/src/utils/agentReferenceResolver/createUnresolvedAgentReferenceDiagnostics';
import { string_book } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';

/**
 * Returns unresolved compact agent-reference diagnostics for the Book editor.
 *
 * The endpoint intentionally accepts the current in-editor text without strict validation
 * so diagnostics still work while the user is in the middle of editing.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const forceRefresh = isTruthySearchParam(new URL(request.url).searchParams.get('forceRefresh'));
        const agentSource = (await request.text()) as string_book;
        const collection = await $provideAgentCollectionForServer();
        const parentAgentPermanentId = await collection.getAgentPermanentId(agentName);
        const allAgents = await collection.listAgents();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver({ forceRefresh });
        const agentReferenceResolver = createBookScopedAgentReferenceResolver({
            parentAgentSource: agentSource,
            parentAgentIdentifier: parentAgentPermanentId,
            localServerUrl: new URL(request.url).origin,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const diagnosticsResult = await createUnresolvedAgentReferenceDiagnostics(
            agentSource,
            agentReferenceResolver,
            allAgents,
            parentAgentPermanentId,
        );

        return new Response(
            JSON.stringify({
                isSuccessful: true,
                agentName,
                diagnostics: diagnosticsResult.diagnostics,
                missingAgentReferences: diagnosticsResult.missingAgentReferences,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * Parses a query-string boolean flag in a permissive way used by internal endpoints.
 *
 * @param value - Raw search-param value.
 * @returns True for common truthy forms (`1`, `true`, `yes`, `on`).
 */
function isTruthySearchParam(value: string | null): boolean {
    if (!value) {
        return false;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue === '1' || normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === 'on';
}
