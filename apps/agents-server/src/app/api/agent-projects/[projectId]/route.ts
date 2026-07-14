import { lstat, readdir } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import {
    resolveAgentProjectFilePath,
    resolveAgentProjectReadAccess,
    readAgentProjectDirectoryUsage,
} from '@/src/utils/agentProjects';

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
    const parsedProjectId = parseProjectId(projectId);

    if (parsedProjectId === null) {
        return NextResponse.json({ error: 'Invalid project id.' }, { status: 400 });
    }

    const accessResult = await resolveAgentProjectReadAccess(parsedProjectId, await getCurrentUser());
    if (!accessResult.isAllowed) {
        return NextResponse.json({ error: accessResult.message }, { status: accessResult.status });
    }

    const project = accessResult.project;
    const usage = await readAgentProjectDirectoryUsage(project.directoryPath);
    const entries = await listRootProjectEntries(project.directoryPath);

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
            entries,
        },
        {
            headers: {
                'Cache-Control': 'no-store',
            },
        },
    );
}

/**
 * Parses a numeric project id.
 *
 * @private function of project API routes
 */
function parseProjectId(projectId: string): number | null {
    const parsedProjectId = Number(projectId);
    return Number.isInteger(parsedProjectId) && parsedProjectId > 0 ? parsedProjectId : null;
}

/**
 * Lists root project entries for the overview route.
 *
 * @private function of `GET`
 */
async function listRootProjectEntries(projectDirectoryPath: string) {
    const entries = await readdir(projectDirectoryPath, { withFileTypes: true }).catch(() => []);

    return await Promise.all(
        entries
            .sort((left, right) => {
                if (left.isDirectory() !== right.isDirectory()) {
                    return left.isDirectory() ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            })
            .slice(0, 100)
            .map(async (entry) => {
                const { absolutePath, relativePath } = resolveAgentProjectFilePath(projectDirectoryPath, entry.name);
                const stats = await lstat(absolutePath);
                return {
                    name: entry.name,
                    path: relativePath,
                    type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
                    sizeBytes: stats.size,
                    updatedAt: stats.mtime.toISOString(),
                };
            }),
    );
}
