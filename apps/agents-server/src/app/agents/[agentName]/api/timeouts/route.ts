import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { listAgentUserChatTimeouts } from '@/src/utils/userChatTimeout';
import type { UserChatTimeoutRecord, UserChatTimeoutStatus } from '@/src/utils/userChatTimeout';
import { resolveUserChatScope } from '../user-chats/resolveUserChatScope';

/**
 * Upper bound for one agent-wide planned-message listing response.
 */
const MAX_AGENT_TIMEOUT_MANAGER_ITEMS = 500;

/**
 * Deterministic status order used in the goal-chat planned-message list.
 */
const TIMEOUT_STATUS_ORDER: Record<UserChatTimeoutStatus, number> = {
    RUNNING: 0,
    QUEUED: 1,
    COMPLETED: 3,
    FAILED: 4,
    CANCELLED: 5,
};

/**
 * Lists every planned message of one agent, as shown in its goal chat.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
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
        // Note: Planned messages belong to the agent, so the goal chat lists them across every chat
        //       and every user of the agent
        const timeouts = await listAgentUserChatTimeouts({
            agentPermanentId: scopeResult.scope.agentPermanentId,
            limit: MAX_AGENT_TIMEOUT_MANAGER_ITEMS,
        });

        const sortedTimeouts = [...timeouts].sort(sortTimeoutRowsForManager);

        return NextResponse.json({
            items: sortedTimeouts,
            counters: createAgentTimeoutCounters(sortedTimeouts),
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list agent timeouts.' },
            { status: 500 },
        );
    }
}

/**
 * Creates status counters consumed by the timeout manager header cards.
 */
function createAgentTimeoutCounters(timeouts: ReadonlyArray<UserChatTimeoutRecord>): {
    allCount: number;
    queuedCount: number;
    runningCount: number;
    pausedCount: number;
    completedCount: number;
    failedCount: number;
    cancelledCount: number;
} {
    let queuedCount = 0;
    let runningCount = 0;
    let pausedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    for (const timeout of timeouts) {
        if (timeout.status === 'QUEUED') {
            queuedCount += 1;
        } else if (timeout.status === 'RUNNING') {
            runningCount += 1;
        } else if (timeout.status === 'COMPLETED') {
            completedCount += 1;
        } else if (timeout.status === 'FAILED') {
            failedCount += 1;
        } else if (timeout.status === 'CANCELLED') {
            cancelledCount += 1;
        }

        if (timeout.pausedAt) {
            pausedCount += 1;
        }
    }

    return {
        allCount: timeouts.length,
        queuedCount,
        runningCount,
        pausedCount,
        completedCount,
        failedCount,
        cancelledCount,
    };
}

/**
 * Sorts timeout rows for predictable manager rendering.
 */
function sortTimeoutRowsForManager(left: UserChatTimeoutRecord, right: UserChatTimeoutRecord): number {
    const leftStatusOrder = left.status === 'QUEUED' && left.pausedAt ? 2 : TIMEOUT_STATUS_ORDER[left.status];
    const rightStatusOrder = right.status === 'QUEUED' && right.pausedAt ? 2 : TIMEOUT_STATUS_ORDER[right.status];

    if (leftStatusOrder !== rightStatusOrder) {
        return leftStatusOrder - rightStatusOrder;
    }

    if (left.status === 'RUNNING') {
        const leftStartedAt = Date.parse(left.startedAt || '');
        const rightStartedAt = Date.parse(right.startedAt || '');
        if (Number.isFinite(leftStartedAt) && Number.isFinite(rightStartedAt) && leftStartedAt !== rightStartedAt) {
            return rightStartedAt - leftStartedAt;
        }
    }

    if (left.status === 'QUEUED') {
        const leftDueAt = Date.parse(left.dueAt);
        const rightDueAt = Date.parse(right.dueAt);
        if (Number.isFinite(leftDueAt) && Number.isFinite(rightDueAt) && leftDueAt !== rightDueAt) {
            return leftDueAt - rightDueAt;
        }
    }

    const leftUpdatedAt = Date.parse(left.updatedAt);
    const rightUpdatedAt = Date.parse(right.updatedAt);
    if (Number.isFinite(leftUpdatedAt) && Number.isFinite(rightUpdatedAt) && leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
    }

    return right.createdAt.localeCompare(left.createdAt);
}
