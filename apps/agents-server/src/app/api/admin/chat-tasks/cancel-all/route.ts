import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { cancelAllActiveAdminChatTasks } from '@/src/utils/cancelAllActiveAdminChatTasks';
import { readRequiredAdminReason } from '@/src/utils/readRequiredAdminReason';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Requests admin cancellation for every active (queued or running) durable chat task at once.
 */
export async function POST(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reason = await readRequiredAdminReason(request);

    if (!reason) {
        return NextResponse.json({ error: 'A non-empty reason is required.' }, { status: 400 });
    }

    try {
        const actor = (await getCurrentUser())?.username || 'admin';
        const summary = await cancelAllActiveAdminChatTasks({
            actor,
            reason,
            requestOrigin: new URL(request.url).origin,
        });

        console.info('[admin-chat-task] cancel-all', {
            actor,
            reason,
            matchedCount: summary.matchedCount,
            cancelledCount: summary.cancelledCount,
            hasMore: summary.hasMore,
        });

        return NextResponse.json({ ok: true, ...summary });
    } catch (error) {
        console.error('[admin-chat-task] cancel-all failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel all tasks.' },
            { status: 500 },
        );
    }
}
