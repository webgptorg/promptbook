import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    cancelAllActiveAgentScopedUserChatTimeouts,
    pauseAllActiveAgentScopedUserChatTimeouts,
    resumeAllPausedAgentScopedUserChatTimeouts,
} from '@/src/utils/userChatTimeout';
import { createUserChatScopeErrorResponse, resolveUserChatScope } from '../../user-chats/resolveUserChatScope';

/**
 * Supported bulk actions for one agent-scoped timeout manager request.
 */
type AgentTimeoutBulkAction = 'cancel_all_active' | 'pause_all_active' | 'resume_all_paused';

/**
 * Request payload accepted by timeout bulk-actions endpoint.
 */
type AgentTimeoutBulkActionPayload = {
    action?: unknown;
};

/**
 * Parses and validates one timeout bulk action payload.
 */
function parseTimeoutBulkActionPayload(payload: AgentTimeoutBulkActionPayload): AgentTimeoutBulkAction | null {
    if (payload.action === 'cancel_all_active') {
        return payload.action;
    }

    if (payload.action === 'pause_all_active') {
        return payload.action;
    }

    if (payload.action === 'resume_all_paused') {
        return payload.action;
    }

    return null;
}

/**
 * Executes one bulk timeout action for current user+agent scope.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const scopeResult = await resolveUserChatScope(agentName, request);

    if (!scopeResult.ok) {
        return createUserChatScopeErrorResponse(scopeResult.error);
    }

    try {
        const payload = (await request.json().catch(() => ({}))) as AgentTimeoutBulkActionPayload;
        const action = parseTimeoutBulkActionPayload(payload);
        if (!action) {
            return NextResponse.json({ error: 'Invalid timeout bulk action.' }, { status: 400 });
        }
        const scope = scopeResult.scope;

        const summary =
            action === 'cancel_all_active'
                ? await cancelAllActiveAgentScopedUserChatTimeouts({
                      userId: scope.userId,
                      agentPermanentId: scope.agentPermanentId,
                  })
                : action === 'pause_all_active'
                ? await pauseAllActiveAgentScopedUserChatTimeouts({
                      userId: scope.userId,
                      agentPermanentId: scope.agentPermanentId,
                  })
                : await resumeAllPausedAgentScopedUserChatTimeouts({
                      userId: scope.userId,
                      agentPermanentId: scope.agentPermanentId,
                  });

        return NextResponse.json({
            action,
            matchedCount: summary.matchedCount,
            updatedCount: summary.updatedCount,
            timeoutIds: summary.timeoutIds,
            hasMore: summary.hasMore,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to execute timeout bulk action.' },
            { status: 400 },
        );
    }
}
