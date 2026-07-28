import { NextResponse } from 'next/server';
import { getAdminChatTaskById } from '@/src/utils/getAdminChatTaskById';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Loads one durable background task for the admin task detail page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    const serverDomain = new URL(request.url).searchParams.get('serverDomain')?.trim() || null;

    const isAuthorized = serverDomain ? await isUserGlobalAdmin() : await isUserAdmin();
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { taskId: rawTaskId } = await params;
        const taskId = decodeURIComponent(rawTaskId);
        const task = await getAdminChatTaskById(taskId, serverDomain);

        if (!task) {
            return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
        }

        return NextResponse.json({ task });
    } catch (error) {
        console.error('[admin-chat-task] detail failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
