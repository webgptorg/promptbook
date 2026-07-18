import { NextResponse } from 'next/server';
import { NotAllowed } from '../../../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../../../src/errors/NotFoundError';
import { resolveThemeMode, THEME_MODE_COOKIE_NAME, type ResolvedThemeMode } from '@/src/constants/themeMode';
import {
    AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE,
    resolveAgentProjectsAccess,
} from '@/src/utils/agentProjects/agentProjectAccess';
import { AGENT_PROJECT_VSCODE_COOKIE_NAME } from '@/src/utils/agentProjects/agentProjectVscodeProxy';
import { startAgentProjectVscodeSession } from '@/src/utils/agentProjects/agentProjectVscodeServer';
import { resolveAgentProjectInfo } from '@/src/utils/agentProjects/resolveAgentProjectInfo';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { readCookieHeaderValue } from '@/src/utils/readCookieHeaderValue';

/**
 * Cookie lifetime for browser VS Code proxy access tokens.
 */
const AGENT_PROJECT_VSCODE_COOKIE_MAX_AGE_SECONDS = 6 * 2 * 60 * 60;

/**
 * Forces runtime session state to be checked on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Ensures the launcher can start local child processes.
 */
export const runtime = 'nodejs';

/**
 * Route parameters for the project browser VS Code launcher.
 */
type AgentProjectVscodeRouteParams = {
    /**
     * Agent route segment.
     */
    readonly agentName: string;

    /**
     * Project route segment.
     */
    readonly projectName: string;
};

/**
 * Starts or reconnects browser VS Code for one agent project and redirects to its same-origin proxy.
 *
 * @param request - Incoming browser request.
 * @param context - Route context.
 * @returns Redirect to the proxied VS Code workbench.
 */
export async function GET(
    request: Request,
    context: { params: Promise<AgentProjectVscodeRouteParams> },
): Promise<NextResponse> {
    const params = await context.params;
    const agentIdentifier = decodeRouteSegment(params.agentName);
    const projectName = decodeRouteSegment(params.projectName);
    const routeTarget = await resolveAgentRouteTarget(agentIdentifier);

    if (!routeTarget || routeTarget.kind !== 'local') {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const [access, isSuperAdmin] = await Promise.all([
        resolveAgentProjectsAccess(routeTarget.canonicalAgentId, { request }),
        isUserGlobalAdmin(),
    ]);

    if (!access.isProjectOverviewVisible) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!access.isProjectDetailsVisible) {
        return NextResponse.json({ error: AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE }, { status: 403 });
    }

    if (!isSuperAdmin) {
        return NextResponse.json(
            {
                error: 'Browser VS Code for project files is available only to the super admin.',
            },
            { status: 403 },
        );
    }

    try {
        const project = await resolveAgentProjectInfo(routeTarget.canonicalAgentId, projectName);
        if (!project) {
            return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
        }

        const vscodeSession = await startAgentProjectVscodeSession({
            agentPermanentId: routeTarget.canonicalAgentId,
            projectName: project.projectName,
            projectPath: project.absolutePath,
            resolvedThemeMode: resolveRequestedThemeMode(request),
        });
        const redirectUrl = new URL(`${vscodeSession.proxyBasePath}/`, request.url);
        const response = NextResponse.redirect(redirectUrl);

        response.cookies.set(AGENT_PROJECT_VSCODE_COOKIE_NAME, vscodeSession.accessToken, {
            httpOnly: true,
            maxAge: AGENT_PROJECT_VSCODE_COOKIE_MAX_AGE_SECONDS,
            path: vscodeSession.proxyBasePath,
            sameSite: 'lax',
        });

        return response;
    } catch (error) {
        if (error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to start browser VS Code.',
            },
            { status: 500 },
        );
    }
}

/**
 * Decodes one route segment while tolerating malformed legacy URLs.
 *
 * @param segment - Raw route segment.
 * @returns Decoded segment.
 */
function decodeRouteSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * Resolves the requested VS Code theme from the launcher query string.
 *
 * @param request - Incoming browser request.
 * @returns Concrete light/dark theme.
 */
function resolveRequestedThemeMode(request: Request): ResolvedThemeMode {
    const requestUrl = new URL(request.url);
    const rawQueryThemeMode = requestUrl.searchParams.get('theme');

    if (rawQueryThemeMode) {
        const queryThemeMode = resolveThemeMode(rawQueryThemeMode);

        if (queryThemeMode === 'DARK') {
            return 'DARK';
        }

        if (queryThemeMode === 'LIGHT') {
            return 'LIGHT';
        }
    }

    const cookieThemeMode = resolveThemeMode(
        readCookieHeaderValue(request.headers.get('cookie'), THEME_MODE_COOKIE_NAME),
    );
    return cookieThemeMode === 'DARK' ? 'DARK' : 'LIGHT';
}
