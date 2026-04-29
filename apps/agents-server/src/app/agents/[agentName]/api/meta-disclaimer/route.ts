import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { acceptUserMetaDisclaimer, resolveMetaDisclaimerStatusForUser } from '@/src/utils/metaDisclaimer';
import { resolveCurrentOrInternalServerOrigin } from '@/src/utils/resolveCurrentOrInternalServerOrigin';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import type { string_book } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { createUserChatScopeErrorResponse, resolveUserChatScope } from '../user-chats/resolveUserChatScope';

/**
 * Resolved context needed by META DISCLAIMER API handlers.
 */
type MetaDisclaimerRouteContext = {
    userId: number;
    agentPermanentId: string;
    agentSource: string_book;
};

/**
 * Resolves `(userId, agentPermanentId, agentSource)` for one API request.
 */
async function resolveMetaDisclaimerRouteContext(
    agentIdentifier: string,
    request: Request,
): Promise<{ ok: true; context: MetaDisclaimerRouteContext } | { ok: false; response: NextResponse }> {
    const scopeResult = await resolveUserChatScope(agentIdentifier, request);

    if (!scopeResult.ok) {
        return {
            ok: false,
            response: createUserChatScopeErrorResponse(scopeResult.error),
        };
    }

    try {
        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveServerAgentContext({
            collection,
            agentIdentifier: scopeResult.scope.agentPermanentId,
            localServerUrl: await resolveCurrentOrInternalServerOrigin(),
            fallbackResolver: baseAgentReferenceResolver,
        });

        return {
            ok: true,
            context: {
                userId: scopeResult.scope.userId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                agentSource: resolvedAgentContext.resolvedAgentSource,
            },
        };
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Agent not found.' }, { status: 404 }),
        };
    }
}

/**
 * Returns current META DISCLAIMER status for the requesting user and agent.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const contextResult = await resolveMetaDisclaimerRouteContext(agentName, request);
    if (!contextResult.ok) {
        return contextResult.response;
    }

    try {
        const status = await resolveMetaDisclaimerStatusForUser({
            userId: contextResult.context.userId,
            agentPermanentId: contextResult.context.agentPermanentId,
            agentSource: contextResult.context.agentSource,
        });

        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to resolve disclaimer status.' },
            { status: 500 },
        );
    }
}

/**
 * Stores agreement to META DISCLAIMER for the requesting user and agent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const contextResult = await resolveMetaDisclaimerRouteContext(agentName, request);
    if (!contextResult.ok) {
        return contextResult.response;
    }

    try {
        const status = await resolveMetaDisclaimerStatusForUser({
            userId: contextResult.context.userId,
            agentPermanentId: contextResult.context.agentPermanentId,
            agentSource: contextResult.context.agentSource,
        });

        if (!status.enabled || !status.markdown) {
            return NextResponse.json(status);
        }

        if (!status.accepted) {
            await acceptUserMetaDisclaimer({
                userId: contextResult.context.userId,
                agentPermanentId: contextResult.context.agentPermanentId,
                disclaimerMarkdown: status.markdown,
            });
        }

        return NextResponse.json({
            enabled: true,
            accepted: true,
            markdown: status.markdown,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to store disclaimer agreement.' },
            { status: 500 },
        );
    }
}
