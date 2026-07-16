import { NextResponse } from 'next/server';
import { listAgentProjectDirectoryEntries } from '@/src/utils/agentProjects/listAgentProjectDirectoryEntries';
import { readAgentProjectDirectoryUsage, resolveAgentProjectReadAccess } from '@/src/utils/agentProjects';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { parseAgentProjectIdRouteParameter } from '../parseAgentProjectIdRouteParameter';

/**
 * Maximum root entries returned by the overview route.
 */
const PROJECT_OVERVIEW_MAX_ENTRIES = 100;

/**
 * Project API route params.
 */
type AgentProjectRouteParams = {
    readonly projectId: string;
};

/**
 * Serves a JSON overview of one agent project.
 */
export async function GET(_request: Request, { params }: { params: Promise<AgentProjectRouteParams> }) {
    const { projectId } = await params;
    const parsedProjectId = parseAgentProjectIdRouteParameter(projectId);

    if (parsedProjectId === null) {
        return NextResponse.json({ error: 'Invalid project id.' }, { status: 400 });
    }

    const accessResult = await resolveAgentProjectReadAccess(parsedProjectId, await getCurrentUser());
    if (!accessResult.isAllowed) {
        return NextResponse.json({ error: accessResult.message }, { status: accessResult.status });
    }

    const project = accessResult.project;
    const usage = await readAgentProjectDirectoryUsage(project.directoryPath);
    const listing = await listAgentProjectDirectoryEntries(project.directoryPath, '', {
        maxEntries: PROJECT_OVERVIEW_MAX_ENTRIES,
    }).catch(() => null);

    return NextResponse.json(
        {
            project: {
                id: project.id,
                name: project.name,
                agentPermanentId: project.agentPermanentId,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                directoryPath: project.directoryPath,
                ...usage,
            },
            entries: listing?.entries ?? [],
        },
        {
            headers: {
                'Cache-Control': 'no-store',
            },
        },
    );
}
