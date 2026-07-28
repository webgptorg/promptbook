import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { cancelAllActiveAdminChatTasks } from '@/src/utils/cancelAllActiveAdminChatTasks';
import { readRequiredAdminReason } from '@/src/utils/readRequiredAdminReason';

/**
 * Requests cancellation for every active durable chat task across all servers on the VPS.
 */
export async function POST(request: Request) {
    if (!(await isUserGlobalAdmin())) {
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
            isVpsWide: true,
        });

        return NextResponse.json({ ok: true, ...summary });
    } catch (error) {
        console.error('[admin-chat-task] VPS-wide cancel-all failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel all VPS-wide tasks.' },
            { status: 500 },
        );
    }
}
