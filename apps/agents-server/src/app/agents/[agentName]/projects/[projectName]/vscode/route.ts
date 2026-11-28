import { NextResponse } from 'next/server';
import { NotAllowed } from '../../../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../../../src/errors/NotFoundError';
import { createAgentForbiddenResponse } from '@/src/utils/agentAccess';
import {
    AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE,
    resolveAgentProjectsAccess,
} from '@/src/utils/agentProjects/agentProjectAccess';
import {
    resolveAgentProjectCodeServerThemeMode,
    startAgentProjectCodeServerSession,
} from '@/src/utils/agentProjects/agentProjectCodeServerRegistry';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Forces request-time authorization and code-server session resolution.
 */
export const dynamic = 'force-dynamic';

/**
 * code-server sessions require Node.js process APIs.
 */
export const runtime = 'nodejs';

/**
 * Opens one agent project in browser VS Code.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ agentName: string; projectName: string }> },
): Promise<Response> {
    const { agentName: rawAgentName, projectName: rawProjectName } = await params;
    const routeTarget = await resolveAgentRouteTarget(decodeURIComponent(rawAgentName));

    if (routeTarget === null || routeTarget.kind !== 'local') {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const access = await resolveAgentProjectsAccess(routeTarget.canonicalAgentId, { request });
    if (!access.isProjectOverviewVisible) {
        return createAgentForbiddenResponse();
    }

    if (!access.isProjectDetailsVisible || !access.currentUser) {
        return createAgentForbiddenResponse(AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE);
    }

    const isCurrentUserGlobalAdmin = await isUserGlobalAdmin();
    if (!isCurrentUserGlobalAdmin) {
        return createAgentForbiddenResponse('Only super admins can open project VS Code.');
    }

    try {
        const session = await startAgentProjectCodeServerSession({
            request,
            agentPermanentId: routeTarget.canonicalAgentId,
            projectName: decodeURIComponent(rawProjectName),
            currentUser: access.currentUser,
            themeMode: await resolveAgentProjectCodeServerThemeMode(access.currentUser, request),
            isSuperAdmin: isCurrentUserGlobalAdmin,
        });

        return NextResponse.redirect(session.browserUrl);
    } catch (error) {
        if (error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        throw error;
    }
}
