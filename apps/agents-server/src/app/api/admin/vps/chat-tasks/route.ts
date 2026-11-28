import { NextRequest, NextResponse } from 'next/server';
import { getVpsAdminChatTasksResponse } from '@/src/utils/getVpsAdminChatTasksResponse';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Lists durable background chat tasks aggregated across every server on the VPS.
 *
 * Restricted to the environment-backed superadmin because it reads across all servers on the VPS.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await getVpsAdminChatTasksResponse(request.nextUrl.searchParams);
        if (result.status !== 200) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.response);
    } catch (error) {
        console.error('[admin-chat-task] VPS-wide listing failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
