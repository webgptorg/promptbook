import { NextRequest, NextResponse } from 'next/server';
import { getAdminChatTasksResponse } from '@/src/utils/getAdminChatTasksResponse';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Lists durable background chat tasks for the admin task manager.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await getAdminChatTasksResponse(request.nextUrl.searchParams);
        if (result.status !== 200) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.response);
    } catch (error) {
        console.error('[admin-chat-task] listing failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
