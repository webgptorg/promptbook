import { NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    cancelScheduledUserChatTimeout,
    getAgentScopedUserChatTimeout,
    notifyUserChatTimeoutScheduleChanged,
    updateAgentScopedUserChatTimeout,
} from '@/src/utils/userChatTimeout';
import type { UpdateAgentScopedUserChatTimeoutPatch } from '@/src/utils/userChatTimeout';
import { createUserChatScopeErrorResponse, resolveUserChatScope } from '../../user-chats/resolveUserChatScope';

/**
 * Updates one durable timeout owned by current user for one agent.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ agentName: string; timeoutId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, timeoutId: rawTimeoutId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const timeoutId = decodeURIComponent(rawTimeoutId);
    const scopeResult = await resolveUserChatScope(agentName, request);

    if (!scopeResult.ok) {
        return createUserChatScopeErrorResponse(scopeResult.error);
    }

    try {
        const existingTimeout = await getAgentScopedUserChatTimeout({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            timeoutId,
        });

        if (!existingTimeout) {
            return NextResponse.json({ error: 'Timeout not found.' }, { status: 404 });
        }

        if (
            existingTimeout.status === 'COMPLETED' ||
            existingTimeout.status === 'FAILED' ||
            existingTimeout.status === 'CANCELLED'
        ) {
            return NextResponse.json({ error: 'Timeout is already finished.' }, { status: 409 });
        }

        if (existingTimeout.status === 'RUNNING') {
            return NextResponse.json({ error: 'Running timeout cannot be edited.' }, { status: 409 });
        }

        const parsedPatch = await parseTimeoutPatchPayload(request);
        if (!parsedPatch) {
            return NextResponse.json({ error: 'No valid timeout fields provided.' }, { status: 400 });
        }

        const updatedTimeout = await updateAgentScopedUserChatTimeout({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            timeoutId,
            patch: parsedPatch,
        });

        if (!updatedTimeout) {
            return NextResponse.json({ error: 'Timeout not found.' }, { status: 404 });
        }

        notifyUserChatTimeoutScheduleChanged(updatedTimeout);

        return NextResponse.json(updatedTimeout);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update timeout.' },
            { status: 400 },
        );
    }
}

/**
 * Cancels one durable timeout owned by current user for one agent.
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
    const scopeResult = await resolveUserChatScope(agentName, request);

    if (!scopeResult.ok) {
        return createUserChatScopeErrorResponse(scopeResult.error);
    }

    try {
        const existingTimeout = await getAgentScopedUserChatTimeout({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            timeoutId,
        });

        if (!existingTimeout) {
            return NextResponse.json({ error: 'Timeout not found.' }, { status: 404 });
        }

        const cancelledTimeout = await cancelScheduledUserChatTimeout(timeoutId);

        if (!cancelledTimeout) {
            return NextResponse.json({ error: 'Timeout not found.' }, { status: 404 });
        }

        return NextResponse.json(cancelledTimeout);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel timeout.' },
            { status: 500 },
        );
    }
}

/**
 * Parses and validates timeout update payload from one request.
 */
async function parseTimeoutPatchPayload(request: Request): Promise<UpdateAgentScopedUserChatTimeoutPatch | null> {
    const payload = (await request.json().catch(() => ({}))) as {
        dueAt?: unknown;
        recurrenceIntervalMs?: unknown;
        message?: unknown;
        parameters?: unknown;
        paused?: unknown;
        extendByMs?: unknown;
    };

    const patch: UpdateAgentScopedUserChatTimeoutPatch = {};

    if (typeof payload.dueAt === 'string' && payload.dueAt.trim().length > 0) {
        const normalizedDueAt = payload.dueAt.trim();
        const dueAtTimestamp = Date.parse(normalizedDueAt);
        if (!Number.isFinite(dueAtTimestamp)) {
            throw new Error('`dueAt` must be a valid ISO timestamp.');
        }
        patch.dueAt = new Date(dueAtTimestamp).toISOString();
    }

    if (payload.recurrenceIntervalMs === null) {
        patch.recurrenceIntervalMs = null;
    } else if (typeof payload.recurrenceIntervalMs === 'number') {
        if (!Number.isFinite(payload.recurrenceIntervalMs) || payload.recurrenceIntervalMs <= 0) {
            throw new Error('`recurrenceIntervalMs` must be a positive number of milliseconds or `null`.');
        }
        patch.recurrenceIntervalMs = Math.floor(payload.recurrenceIntervalMs);
    }

    if (payload.message === null) {
        patch.message = null;
    } else if (typeof payload.message === 'string') {
        patch.message = payload.message;
    }

    if (payload.parameters !== undefined) {
        if (!payload.parameters || typeof payload.parameters !== 'object' || Array.isArray(payload.parameters)) {
            throw new Error('`parameters` must be a JSON object.');
        }
        patch.parameters = payload.parameters as Record<string, unknown>;
    }

    if (typeof payload.paused === 'boolean') {
        patch.pausedAt = payload.paused ? new Date().toISOString() : null;
    }

    if (typeof payload.extendByMs === 'number') {
        if (!Number.isFinite(payload.extendByMs) || payload.extendByMs <= 0) {
            throw new Error('`extendByMs` must be a positive number of milliseconds.');
        }
        patch.extendByMs = Math.floor(payload.extendByMs);
    }

    if (patch.dueAt !== undefined && patch.extendByMs !== undefined) {
        throw new Error('`dueAt` and `extendByMs` cannot be used together.');
    }

    return Object.keys(patch).length > 0 ? patch : null;
}
