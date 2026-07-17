import { NextResponse } from 'next/server';
import { NotAllowed } from '../../../../../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../../../../../src/errors/NotFoundError';
import { createAgentForbiddenResponse, resolveAgentAccess } from '@/src/utils/agentAccess';
import { readAgentProjectFile } from '@/src/utils/agentProjects/readAgentProjectFile';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';

/**
 * Content types that can execute scripts or load same-origin resources when rendered.
 */
const SANDBOXED_CONTENT_TYPE_PREFIXES = ['text/html', 'image/svg+xml', 'application/xml'];

/**
 * Serves one raw file of one agent project.
 *
 * The agent references these URLs in chat answers to share its project files, so access
 * follows the agent visibility rules — whoever may chat with the agent may open the links.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ agentName: string; projectName: string; filePath: ReadonlyArray<string> }> },
) {
    const { agentName: rawAgentName, projectName: rawProjectName, filePath: rawFilePath } = await params;
    const agentIdentifier = decodeURIComponent(rawAgentName);

    const routeTarget = await resolveAgentRouteTarget(agentIdentifier);
    if (routeTarget === null || routeTarget.kind !== 'local') {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const access = await resolveAgentAccess(routeTarget.canonicalAgentId, { request });
    if (!access.isAllowed) {
        return createAgentForbiddenResponse();
    }

    try {
        const projectFile = await readAgentProjectFile({
            agentPermanentId: routeTarget.canonicalAgentId,
            projectName: decodeURIComponent(rawProjectName),
            filePathSegments: rawFilePath.map((filePathSegment) => decodeURIComponent(filePathSegment)),
        });

        return new NextResponse(new Uint8Array(projectFile.content), {
            status: 200,
            headers: createProjectFileResponseHeaders(projectFile.contentType),
        });
    } catch (error) {
        if (error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        throw error;
    }
}

/**
 * Creates response headers keeping served project files safe to open in the browser.
 *
 * Active content (HTML, SVG, XML) is sandboxed into an opaque origin so a hosted page can
 * render and run its own scripts but can never read Agents Server cookies or storage.
 */
function createProjectFileResponseHeaders(contentType: string): Headers {
    const headers = new Headers({
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
    });

    if (SANDBOXED_CONTENT_TYPE_PREFIXES.some((sandboxedPrefix) => contentType.startsWith(sandboxedPrefix))) {
        headers.set('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups');
    }

    return headers;
}
