import { NextResponse } from 'next/server';
import { AGENT_PROJECT_RUNTIME_AUTH_RESPONSE_PORT_HEADER } from '@/src/utils/agentProjects/agentProjectRuntimeConstants';
import { resolveAgentProjectRuntimeByDomain } from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';

/**
 * Forces request-time runtime lookup for nginx auth subrequests.
 */
export const dynamic = 'force-dynamic';

/**
 * Runtime lookup requires Node.js process and filesystem APIs.
 */
export const runtime = 'nodejs';

/**
 * Authorizes an nginx proxy request to one public agent project subdomain.
 */
export async function GET(request: Request): Promise<Response> {
    const runtimeInfo = await resolveAgentProjectRuntimeByDomain(request.headers.get('host'));

    if (!runtimeInfo || !runtimeInfo.isRunning) {
        return NextResponse.json({ error: 'Project runtime is not running.' }, { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: {
            [AGENT_PROJECT_RUNTIME_AUTH_RESPONSE_PORT_HEADER]: String(runtimeInfo.port),
            'Cache-Control': 'no-store',
        },
    });
}
