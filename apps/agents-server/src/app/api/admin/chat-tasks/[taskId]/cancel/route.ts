import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { cancelAdminChatTaskById } from '@/src/utils/cancelAdminChatTaskById';
import { readRequiredAdminReason } from '@/src/utils/readRequiredAdminReason';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Requests admin cancellation for one queued or running durable chat task.
 */
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId: rawTaskId } = await params;
    const taskId = decodeURIComponent(rawTaskId);
    const reason = await readRequiredAdminReason(request);

    if (!reason) {
        return NextResponse.json({ error: 'A non-empty reason is required.' }, { status: 400 });
    }

    try {
        const actor = (await getCurrentUser())?.username || 'admin';
        const outcome = await cancelAdminChatTaskById({
            taskId,
            actor,
            reason,
            requestOrigin: new URL(request.url).origin,
        });

        if (outcome === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
        }

        if (outcome === 'ALREADY_FINISHED') {
            return NextResponse.json({ error: 'Task is already finished.' }, { status: 409 });
        }

        if (outcome === 'NOT_CANCELLABLE') {
            return NextResponse.json({ error: 'Task could not be cancelled.' }, { status: 409 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[admin-chat-task] cancel failed', { taskId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel task.' },
            { status: 500 },
        );
    }
}
