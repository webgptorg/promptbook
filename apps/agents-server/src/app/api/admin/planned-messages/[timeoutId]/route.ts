import { NextResponse } from 'next/server';
import { ParseError } from '../../../../../../../../src/errors/ParseError';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { cancelManagedPlannedMessage } from '@/src/utils/plannedMessageManager/cancelManagedPlannedMessage';
import { parsePlannedMessageManagerUpdateRequest } from '@/src/utils/plannedMessageManager/parsePlannedMessageManagerUpdateRequest';
import { updateManagedPlannedMessage } from '@/src/utils/plannedMessageManager/updateManagedPlannedMessage';

/**
 * Keeps planned-message persistence on the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Changes the schedule, the text, or the paused state of one planned message of any agent.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ timeoutId: string }> }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeoutId = decodeURIComponent((await params).timeoutId);

    try {
        const updateRequest = parsePlannedMessageManagerUpdateRequest(await request.json().catch(() => null));
        const updateResult = await updateManagedPlannedMessage(timeoutId, updateRequest);

        if (updateResult.status === 'not_found') {
            return NextResponse.json({ error: 'Planned message not found.' }, { status: 404 });
        }

        if (updateResult.status === 'busy') {
            return NextResponse.json(
                { error: 'This planned message is waking its agent right now, so its plan cannot be changed.' },
                { status: 409 },
            );
        }

        return NextResponse.json({ plannedMessage: updateResult.plannedMessage });
    } catch (error) {
        if (error instanceof ParseError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error('[admin-planned-message] update failed', { timeoutId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update the planned message.' },
            { status: 500 },
        );
    }
}

/**
 * Cancels one planned message of any agent, so it never wakes that agent again.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ timeoutId: string }> }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeoutId = decodeURIComponent((await params).timeoutId);

    try {
        const cancelResult = await cancelManagedPlannedMessage(timeoutId);

        if (cancelResult === 'not_found') {
            return NextResponse.json(
                { error: 'There is no planned message to cancel under this id.' },
                { status: 404 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[admin-planned-message] cancel failed', { timeoutId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel the planned message.' },
            { status: 500 },
        );
    }
}
