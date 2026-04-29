import type { ChatMessage } from '@promptbook-local/components';
import { normalizeChatAttachments } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { parseBookScopedAgentIdentifier } from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { resolveChatMessageContentForApiRequest } from '@/src/utils/chat/validateChatMessageContent';
import { resolveAgentVisibilityAccess } from '@/src/utils/agentAccess';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { isAgentDeleted } from '../../_utils';
import { createAgentChatApiErrorResponse } from './createAgentChatApiErrorResponse';
import { createAgentChatStreamResponse } from './createAgentChatStreamResponse';
import { resolveAgentChatRouteContext } from './resolveAgentChatRouteContext';

/**
 * Shape of the incoming chat API payload.
 *
 * `attachments` and `parameters` are normalized later, so they stay unknown here.
 */
type ChatRequestBody = {
    message?: unknown;
    thread?: ReadonlyArray<ChatMessage>;
    attachments?: unknown;
    parameters?: unknown;
};

/**
 * Allow long-running streams: set to platform maximum (seconds)
 */
export const maxDuration = 300;

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
 * Handles post.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const deletedCheckAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'stream');
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    // Check if agent is deleted
    if (await isAgentDeleted(deletedCheckAgentIdentifier)) {
        return createAgentChatApiErrorResponse(
            'This agent has been deleted. You can restore it from the Recycle Bin.',
            410, // Gone - indicates the resource is no longer available
            'agent_deleted',
        );
    }

    const access = await resolveAgentVisibilityAccess({
        agentIdentifier: deletedCheckAgentIdentifier,
        request,
        isInternalAgentAccessAllowed: true,
    });
    if (!access.isAllowed) {
        return createAgentChatApiErrorResponse('Forbidden', 403, 'forbidden');
    }

    const rawBody = (await request.json().catch(() => null)) as unknown;
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        return createAgentChatApiErrorResponse('Invalid request body.', 400, 'invalid_request_error');
    }

    const body = rawBody as ChatRequestBody;
    const messageResolution = resolveChatMessageContentForApiRequest(body.message);
    if (!messageResolution.isValid) {
        return createAgentChatApiErrorResponse(
            messageResolution.issue.message,
            messageResolution.issue.status,
            'invalid_request_error',
        );
    }

    const message = messageResolution.message;
    const thread = body.thread ? [...body.thread] : undefined;
    const attachments = normalizeChatAttachments(body.attachments);
    const rawParameters = body.parameters ?? {};
    const isPrivateModeEnabled = isPrivateModeEnabledFromRequest(request);
    //      <- TODO: [🐱‍🚀] To configuration DEFAULT_INITIAL_HIDDEN_MESSAGE

    try {
        const contextResolution = await resolveAgentChatRouteContext({
            request,
            agentName,
            message,
            thread,
            attachments,
            rawParameters,
            isPrivateModeEnabled,
        });
        if (!contextResolution.ok) {
            return contextResolution.response;
        }

        return createAgentChatStreamResponse({
            request,
            context: contextResolution.context,
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
