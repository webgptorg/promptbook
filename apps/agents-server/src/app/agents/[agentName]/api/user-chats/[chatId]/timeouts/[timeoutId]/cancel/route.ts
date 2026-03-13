import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { cancelScheduledUserChatTimeout, getUserChatTimeout } from '@/src/utils/userChatTimeout';
import { createUserChatDetailPayload, getUserChat, isFrozenUserChatSource } from '@/src/utils/userChat';
import { resolveUserChatScope } from '../../../../resolveUserChatScope';

/**
 * Requests cancellation for one queued or running thread-scoped timeout.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ agentName: string; chatId: string; timeoutId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId, timeoutId: rawTimeoutId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const timeoutId = decodeURIComponent(rawTimeoutId);
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

        if (isFrozenUserChatSource(chat.source)) {
            return NextResponse.json({ error: 'Frozen chats are view-only in the web UI.' }, { status: 403 });
        }

        const timeout = await getUserChatTimeout({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            timeoutId,
        });

        if (timeout && timeout.status !== 'COMPLETED' && timeout.status !== 'FAILED' && timeout.status !== 'CANCELLED') {
            await cancelScheduledUserChatTimeout(timeout.timeoutId);
        }

        const refreshedChat = await getUserChat({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!refreshedChat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        return NextResponse.json(await createUserChatDetailPayload(refreshedChat));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel chat timeout.' },
            { status: 500 },
        );
    }
}
