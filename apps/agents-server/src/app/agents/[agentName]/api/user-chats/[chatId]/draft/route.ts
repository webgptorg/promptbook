import { NextResponse } from 'next/server';
import { getUserChat, isFrozenUserChatSource, updateUserChatDraft } from '@/src/utils/userChat';
import { UserChatScopeError } from '@/src/utils/userChat/UserChatScopeError';
import { resolveUserChatScope } from '../../resolveUserChatScope';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';

/**
 * Updates the draft message for one chat without modifying messages or activity timestamps.
 *
 * Missing chats are treated as a no-op to keep draft persistence best-effort during
 * concurrent delete/navigation races.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ agentName: string; chatId: string }> },
) {
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
        if (scopeResult.error === 'FORBIDDEN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
            return NextResponse.json({ success: true });
        }

        if (isFrozenUserChatSource(existingChat.source)) {
            return NextResponse.json({ error: 'Frozen chats are view-only in the web UI.' }, { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as { draftMessage?: string | null };

        if (body.draftMessage !== null && typeof body.draftMessage !== 'string') {
            return NextResponse.json({ error: 'draftMessage must be a string or null.' }, { status: 400 });
        }

        await updateUserChatDraft({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            draftMessage: body.draftMessage ?? null,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof UserChatScopeError) {
            return resolveUserChatDraftScopeErrorResponse(error);
        }

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update chat draft.',
                code: 'USER_CHAT_DRAFT_UPDATE_FAILED',
            },
            { status: 500 },
        );
    }
}

/**
 * Resolves one HTTP response for branded user-chat scope failures during draft persistence.
 *
 * @private route helper
 */
function resolveUserChatDraftScopeErrorResponse(error: UserChatScopeError): NextResponse {
    if (error.code === 'USER_CHAT_NOT_FOUND') {
        return NextResponse.json({ success: true });
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
