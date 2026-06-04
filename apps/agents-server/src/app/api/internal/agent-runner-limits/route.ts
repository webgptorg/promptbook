import { NextResponse } from 'next/server';
import { resolveUserChatWorkerInternalToken } from '@/src/utils/userChat';
import { getLocalAgentRunnerLimits } from '@/src/utils/serverLimits';

/**
 * Loads local agent-runner limits for the foreground CLI worker.
 */
export async function GET(request: Request) {
    return handleAgentRunnerLimitsRequest(request);
}

/**
 * Loads local agent-runner limits for the foreground CLI worker.
 */
export async function POST(request: Request) {
    return handleAgentRunnerLimitsRequest(request);
}

/**
 * Validates authorization and returns the current local runner retry limits.
 *
 * @param request - Incoming route request.
 * @returns Local runner limits response.
 */
async function handleAgentRunnerLimitsRequest(request: Request) {
    if (!isAuthorizedInternalWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getLocalAgentRunnerLimits());
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load local agent runner limits.',
            },
            { status: 500 },
        );
    }
}

/**
 * Validates the shared internal worker token.
 *
 * @param request - Incoming route request.
 * @returns `true` when the internal worker token matches.
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return token === resolveUserChatWorkerInternalToken();
}
