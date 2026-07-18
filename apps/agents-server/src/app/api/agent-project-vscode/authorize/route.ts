import { NextResponse } from 'next/server';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import {
    AGENT_PROJECT_VSCODE_ORIGINAL_URI_HEADER,
    AGENT_PROJECT_VSCODE_PROXY_PORT_HEADER,
} from '@/src/utils/agentProjects/agentProjectVscodeConstants';
import { parseAgentProjectVscodeRuntimeIdFromProxyUri } from '@/src/utils/agentProjects/agentProjectVscodeHrefs';
import { resolveAgentProjectVscodeRuntimeById } from '@/src/utils/agentProjects/agentProjectVscodeRegistry';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Nginx auth requests must always reflect the latest in-memory VS Code runtime registry.
 */
export const dynamic = 'force-dynamic';

/**
 * Runtime registry access requires the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Authorizes a standalone VPS Nginx subrequest and returns the local code-server port.
 */
export async function GET(request: Request): Promise<Response> {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const originalUri = request.headers.get(AGENT_PROJECT_VSCODE_ORIGINAL_URI_HEADER) || '';
    const runtimeId = parseAgentProjectVscodeRuntimeIdFromProxyUri(originalUri);
    if (!runtimeId) {
        return NextResponse.json({ error: 'Browser VS Code runtime id is required.' }, { status: 400 });
    }

    const vscodeRuntime = await resolveAgentProjectVscodeRuntimeById(runtimeId);
    if (!vscodeRuntime?.isRunning) {
        return NextResponse.json({ error: 'Browser VS Code runtime was not found.' }, { status: 404 });
    }

    const access = await resolveAgentProjectsAccess(vscodeRuntime.agentPermanentId, { request });
    if (!access.isProjectDetailsVisible) {
        return NextResponse.json({ error: 'Project access denied.' }, { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: {
            [AGENT_PROJECT_VSCODE_PROXY_PORT_HEADER]: String(vscodeRuntime.port),
        },
    });
}
