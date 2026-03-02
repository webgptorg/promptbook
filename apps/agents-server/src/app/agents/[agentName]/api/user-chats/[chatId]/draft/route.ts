import { NextResponse } from 'next/server';
import { updateUserChatDraft } from '@/src/utils/userChat';
import { resolveUserChatScope } from '../../resolveUserChatScope';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';

/**
 * Updates the draft message for one chat without modifying messages or activity timestamps.
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
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update chat draft.' },
            { status: 400 },
        );
    }
}
