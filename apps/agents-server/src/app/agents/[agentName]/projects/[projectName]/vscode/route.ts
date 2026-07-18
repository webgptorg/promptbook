import { NextResponse } from 'next/server';
import { EnvironmentMismatchError } from '../../../../../../../../../src/errors/EnvironmentMismatchError';
import { NotAllowed } from '../../../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../../../src/errors/NotFoundError';
import { createAgentForbiddenResponse } from '@/src/utils/agentAccess';
import {
    AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE,
    resolveAgentProjectsAccess,
} from '@/src/utils/agentProjects/agentProjectAccess';
import { buildAgentProjectVscodeLaunchUrl } from '@/src/utils/agentProjects/agentProjectVscodeHrefs';
import { startAgentProjectVscodeRuntime } from '@/src/utils/agentProjects/agentProjectVscodeRegistry';
import { resolveAgentProjectVscodeTheme } from '@/src/utils/agentProjects/agentProjectVscodeTheme';
import { AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM } from '@/src/utils/agentProjects/agentProjectVscodeConstants';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Forces fresh access checks and runtime lookup for every browser VS Code launch.
 */
export const dynamic = 'force-dynamic';

/**
 * Browser VS Code starts a local code-server child process, so this route must run in Node.js.
 */
export const runtime = 'nodejs';

/**
 * Opens browser VS Code for one agent project.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ agentName: string; projectName: string }> },
) {
    const { agentName: rawAgentName, projectName: rawProjectName } = await params;
    const agentIdentifier = decodeRouteSegment(rawAgentName);
    const projectName = decodeRouteSegment(rawProjectName);

    const routeTarget = await resolveAgentRouteTarget(agentIdentifier);
    if (routeTarget === null || routeTarget.kind !== 'local') {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const [access, isSuperAdmin] = await Promise.all([
        resolveAgentProjectsAccess(routeTarget.canonicalAgentId, { request }),
        isUserGlobalAdmin(),
    ]);

    if (!access.isProjectOverviewVisible) {
        return createAgentForbiddenResponse();
    }

    if (!access.isProjectDetailsVisible) {
        return createAgentForbiddenResponse(AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE);
    }

    if (!isSuperAdmin) {
        return createAgentForbiddenResponse('Browser VS Code for project files is available only to super admins.');
    }

    try {
        const theme = resolveAgentProjectVscodeTheme(
            new URL(request.url).searchParams.get(AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM),
        );
        const vscodeRuntime = await startAgentProjectVscodeRuntime({
            agentPermanentId: routeTarget.canonicalAgentId,
            projectName,
            theme,
        });

        return NextResponse.redirect(
            new URL(
                buildAgentProjectVscodeLaunchUrl({
                    runtime: vscodeRuntime,
                    theme,
                    isProxyPreferred: isAgentProjectVscodeProxyPreferred(request),
                }),
                request.url,
            ),
        );
    } catch (error) {
        if (error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof EnvironmentMismatchError) {
            return NextResponse.json({ error: error.message }, { status: 503 });
        }

        throw error;
    }
}

/**
 * Decodes one dynamic route segment without failing on already-decoded literal `%` characters.
 */
function decodeRouteSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * Decides whether the same-origin Nginx proxy should be used instead of a direct local URL.
 */
function isAgentProjectVscodeProxyPreferred(request: Request): boolean {
    const forwardedHost = request.headers.get('x-forwarded-host')?.trim() || '';
    const host = forwardedHost || request.headers.get('host')?.trim() || '';

    if (!host) {
        return true;
    }

    return !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/u.test(host);
}
