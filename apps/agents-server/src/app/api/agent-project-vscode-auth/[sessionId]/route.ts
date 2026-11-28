import { NextResponse } from 'next/server';
import {
    AGENT_PROJECT_CODE_SERVER_AUTH_RESPONSE_PORT_HEADER,
    isAgentProjectCodeServerSessionAuthorized,
    resolveAgentProjectCodeServerSession,
} from '@/src/utils/agentProjects/agentProjectCodeServerRegistry';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Forces request-time authorization for nginx auth subrequests.
 */
export const dynamic = 'force-dynamic';

/**
 * code-server session lookup requires Node.js process state.
 */
export const runtime = 'nodejs';

/**
 * Authorizes an nginx proxy request to one browser VS Code session.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }): Promise<Response> {
    const { sessionId } = await params;
    const session = await resolveAgentProjectCodeServerSession(decodeURIComponent(sessionId));

    if (!session) {
        return NextResponse.json({ error: 'VS Code session is forbidden.' }, { status: 403 });
    }

    const [access, isCurrentUserGlobalAdmin] = await Promise.all([
        resolveAgentProjectsAccess(session.agentPermanentId, { request }),
        isUserGlobalAdmin(),
    ]);

    if (
        !access.isProjectDetailsVisible ||
        !isAgentProjectCodeServerSessionAuthorized({
            session,
            currentUser: access.currentUser,
            isSuperAdmin: isCurrentUserGlobalAdmin,
        })
    ) {
        return NextResponse.json({ error: 'VS Code session is forbidden.' }, { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: {
            [AGENT_PROJECT_CODE_SERVER_AUTH_RESPONSE_PORT_HEADER]: String(session.port),
            'Cache-Control': 'no-store',
        },
    });
}
