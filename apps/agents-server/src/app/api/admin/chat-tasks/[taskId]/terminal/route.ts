import { NextResponse } from 'next/server';
import { createInteractiveTerminalEventStream } from '@/src/utils/createInteractiveTerminalEventStream';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { resolveAdminTaskTerminalSession } from '@/src/utils/taskTerminal/resolveAdminTaskTerminalSession';

/**
 * Forces fresh terminal snapshots and live streams for every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Reads or live-streams the read-only CLI terminal of one background task.
 *
 * Restricted to the super-admin because raw task console output can contain
 * internal infrastructure details that regular administrators must not see.
 *
 * Query parameters:
 * - `stream=1` — switches from a JSON snapshot to a Server-Sent-Events live stream
 */
export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId: rawTaskId } = await params;
    const taskId = decodeURIComponent(rawTaskId);

    try {
        const terminalResolution = await resolveAdminTaskTerminalSession(taskId);
        if (!terminalResolution) {
            return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        if (searchParams.get('stream') === '1') {
            return createInteractiveTerminalEventStream(
                request,
                taskId,
                terminalResolution.session,
                terminalResolution.subscribe,
            );
        }

        return NextResponse.json({ session: terminalResolution.session });
    } catch (error) {
        console.error('[admin-chat-task] terminal failed', { taskId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load the task terminal.' },
            { status: 500 },
        );
    }
}
