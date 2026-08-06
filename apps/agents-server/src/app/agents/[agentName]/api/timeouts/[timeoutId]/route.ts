import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { cancelScheduledUserChatTimeout, getAgentScopedUserChatTimeout } from '@/src/utils/userChatTimeout';
import { resolveUserChatScope } from '../../user-chats/resolveUserChatScope';

/**
 * Cancels one planned message of the agent from its goal chat.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ agentName: string; timeoutId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, timeoutId: rawTimeoutId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const timeoutId = decodeURIComponent(rawTimeoutId);
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

    if (!scopeResult.scope.viewerCanAccessAgentGoalChat) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Note: Planned messages belong to the agent, so the goal chat may cancel them across every
        //       chat and every user of the agent
        const existingTimeout = await getAgentScopedUserChatTimeout({
            agentPermanentId: scopeResult.scope.agentPermanentId,
            timeoutId,
        });

        if (!existingTimeout) {
            return NextResponse.json({ error: 'Planned message not found.' }, { status: 404 });
        }

        const cancelledTimeout = await cancelScheduledUserChatTimeout(timeoutId);

        if (!cancelledTimeout) {
            return NextResponse.json({ error: 'Planned message not found.' }, { status: 404 });
        }

        return NextResponse.json(cancelledTimeout);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel the planned message.' },
            { status: 500 },
        );
    }
}
