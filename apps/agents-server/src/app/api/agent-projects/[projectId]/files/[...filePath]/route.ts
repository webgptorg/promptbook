import { lstat, readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { NextResponse } from 'next/server';
import {
    isFileNotFoundError,
    resolveAgentProjectFilePath,
    resolveAgentProjectReadAccess,
} from '@/src/utils/agentProjects';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { parseAgentProjectIdRouteParameter } from '../../../parseAgentProjectIdRouteParameter';

/**
 * Project file API route params.
 */
type AgentProjectFileRouteParams = {
    readonly projectId: string;
    readonly filePath: string[];
};

/**
 * Serves one file from an agent project when the current user may access the owning agent.
 */
export async function GET(_request: Request, { params }: { params: Promise<AgentProjectFileRouteParams> }) {
    const { projectId, filePath } = await params;
    const parsedProjectId = parseAgentProjectIdRouteParameter(projectId);

    if (parsedProjectId === null) {
        return NextResponse.json({ error: 'Invalid project id.' }, { status: 400 });
    }

    const accessResult = await resolveAgentProjectReadAccess(parsedProjectId, await getCurrentUser());
    if (!accessResult.isAllowed) {
        return NextResponse.json({ error: accessResult.message }, { status: accessResult.status });
    }

    const relativePath = filePath.join('/');
    const { absolutePath } = resolveAgentProjectFilePath(accessResult.project.directoryPath, relativePath);

    try {
        const stats = await lstat(absolutePath);
        if (!stats.isFile() && !stats.isSymbolicLink()) {
            return NextResponse.json({ error: 'Project path is not a file.' }, { status: 400 });
        }

        const file = await readFile(absolutePath);
        const filename = basename(relativePath) || 'project-file';

        return new NextResponse(new Uint8Array(file), {
            status: 200,
            headers: {
                'Content-Type': resolveProjectFileMimeType(relativePath),
                'Content-Length': String(file.byteLength),
                'Content-Disposition': `inline; filename="${createContentDispositionFilename(filename)}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return NextResponse.json({ error: 'Project file not found.' }, { status: 404 });
        }

        throw error;
    }
}

/**
 * Resolves a conservative MIME type for a served project file.
 *
 * @private function of `GET`
 */
function resolveProjectFileMimeType(relativePath: string): string {
    switch (extname(relativePath).toLowerCase()) {
        case '.css':
            return 'text/css; charset=utf-8';
        case '.csv':
            return 'text/csv; charset=utf-8';
        case '.html':
        case '.htm':
            return 'text/html; charset=utf-8';
        case '.js':
        case '.mjs':
        case '.cjs':
            return 'text/javascript; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.md':
        case '.txt':
            return 'text/plain; charset=utf-8';
        case '.pdf':
            return 'application/pdf';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.svg':
            return 'image/svg+xml';
        case '.webp':
            return 'image/webp';
        default:
            return 'application/octet-stream';
    }
}

/**
 * Creates a safe ASCII filename for `Content-Disposition`.
 *
 * @private function of `GET`
 */
function createContentDispositionFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'project-file';
}
