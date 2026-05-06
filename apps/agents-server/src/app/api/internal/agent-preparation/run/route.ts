import { resolveAgentPreparationWorkerInternalToken } from '@/src/utils/agentPreparation/resolveAgentPreparationWorkerInternalToken';
import { runAgentPreparationWorkerTick } from '@/src/utils/agentPreparation/agentPreparationWorker';
import { NextResponse } from 'next/server';

/**
 * Allows one agent-preparation worker invocation to run for the platform maximum.
 */
export const maxDuration = 300;

/**
 * Runs one agent-preparation worker tick for internal wake-ups.
 */
export async function POST(request: Request) {
    return handleAgentPreparationWorkerRequest(request);
}

/**
 * Runs one agent-preparation worker tick for Vercel cron or internal wake-ups.
 */
export async function GET(request: Request) {
    return handleAgentPreparationWorkerRequest(request);
}

/**
 * Validates authorization and executes one worker tick.
 *
 * @param request - Incoming route request.
 * @returns Worker execution response.
 */
async function handleAgentPreparationWorkerRequest(request: Request) {
    if (!isAuthorizedAgentPreparationWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requestBody = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
        const tablePrefix = typeof requestBody?.tablePrefix === 'string' ? requestBody.tablePrefix : undefined;

        await runAgentPreparationWorkerTick({
            tablePrefix,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[agent-preparation] worker route failed', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to process agent preparation worker tick.',
            },
            { status: 500 },
        );
    }
}

/**
 * Validates internal worker-token or Vercel cron authorization.
 *
 * @param request - Incoming route request.
 * @returns `true` when the request may execute the worker.
 */
function isAuthorizedAgentPreparationWorkerRequest(request: Request): boolean {
    return isAuthorizedInternalWorkerRequest(request) || isAuthorizedVercelCronRequest(request);
}

/**
 * Validates the shared internal worker token.
 *
 * @param request - Incoming route request.
 * @returns `true` when the internal worker token matches.
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-agent-preparation-worker-token');
    return token === resolveAgentPreparationWorkerInternalToken();
}

/**
 * Validates the optional Vercel cron bearer token configured via `CRON_SECRET`.
 *
 * @param request - Incoming route request.
 * @returns `true` when the request carries the configured cron secret.
 */
function isAuthorizedVercelCronRequest(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const userAgent = request.headers.get('user-agent') || '';

    if (request.method === 'GET' && userAgent.startsWith('vercel-cron/')) {
        return true;
    }

    if (!cronSecret) {
        return false;
    }

    const authorization = request.headers.get('authorization');
    return authorization === `Bearer ${cronSecret}`;
}
