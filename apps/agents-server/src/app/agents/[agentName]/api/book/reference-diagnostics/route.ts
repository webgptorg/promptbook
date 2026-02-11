import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
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
        const agentSource = (await request.text()) as string_book;
        const agentReferenceResolver = await $provideAgentReferenceResolver();
        const diagnostics = await createUnresolvedAgentReferenceDiagnostics(agentSource, agentReferenceResolver);

        return new Response(
            JSON.stringify({
                isSuccessful: true,
                agentName,
                diagnostics,
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
