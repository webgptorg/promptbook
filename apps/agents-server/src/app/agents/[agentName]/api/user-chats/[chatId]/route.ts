import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    createUserChatDetailPayload,
    deleteUserChat,
    getUserChat,
    isFrozenUserChatSource,
    updateUserChatMessages,
} from '@/src/utils/userChat';
import { UserChatReplyValidationError } from '@/src/utils/userChat/UserChatReplyValidationError';
import { isUserChatNotFoundScopeError, UserChatScopeError } from '@/src/utils/userChat/UserChatScopeError';
import type { ChatMessage } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../resolveUserChatScope';

/**
 * Loads one chat for current user.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string; chatId: string }> }) {
    void request;

    const { agentName: rawAgentName, chatId: rawChatId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }
    const chatId = decodeURIComponent(rawChatId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const chat = await getUserChat({
            userId: scopeResult.scope.userId,
            viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        return NextResponse.json(await createUserChatDetailPayload(chat));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load chat.' },
            { status: 500 },
        );
    }
}

/**
 * Replaces stored messages for one chat.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ agentName: string; chatId: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const existingChat = await getUserChat({
            userId: scopeResult.scope.userId,
            viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!existingChat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        if (isFrozenUserChatSource(existingChat.source)) {
            return NextResponse.json({ error: 'Frozen chats are view-only in the web UI.' }, { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
            return NextResponse.json({ error: 'messages must be an array.' }, { status: 400 });
        }

        const updatedChat = await updateUserChatMessages({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            messages: body.messages as Array<ChatMessage>,
        });

        return NextResponse.json(await createUserChatDetailPayload(updatedChat));
    } catch (error) {
        if (error instanceof UserChatScopeError) {
            return resolveUserChatUpdateScopeErrorResponse(error);
        }

        if (error instanceof UserChatReplyValidationError) {
            return NextResponse.json(
                {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update chat.',
                code: 'USER_CHAT_UPDATE_FAILED',
            },
            { status: 500 },
        );
    }
}

/**
 * Resolves one HTTP response for scoped user-chat message-save failures.
 *
 * @private route helper
 */
function resolveUserChatUpdateScopeErrorResponse(error: UserChatScopeError): NextResponse {
    if (isUserChatNotFoundScopeError(error)) {
        return NextResponse.json(
            {
                error: 'Chat not found.',
                code: error.code,
                details: error.details,
            },
            { status: 404 },
        );
    }

    const status =
        error.code === 'USER_CHAT_SCOPE_DIAGNOSTICS_FAILED' || error.code === 'USER_CHAT_SCOPE_INCONSISTENT'
            ? 500
            : 404;

    return NextResponse.json(
        {
            error: error.message,
            code: error.code,
            details: error.details,
        },
        { status },
    );
}

/**
 * Deletes one chat for current user.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ agentName: string; chatId: string }> }) {
    void request;

    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const existingChat = await getUserChat({
            userId: scopeResult.scope.userId,
            viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!existingChat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        if (isFrozenUserChatSource(existingChat.source)) {
            return NextResponse.json({ error: 'Frozen chats are view-only in the web UI.' }, { status: 403 });
        }

        const wasDeleted = await deleteUserChat({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!wasDeleted) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete chat.' },
            { status: 500 },
        );
    }
}
