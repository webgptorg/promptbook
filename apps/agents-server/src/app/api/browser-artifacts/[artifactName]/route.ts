import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import {
    isRunBrowserArtifactFilename,
    resolveRunBrowserArtifactFilesystemPath,
} from '../../../../utils/runBrowserArtifactStorage';

/**
 * Resolves MIME type from browser artifact filename.
 */
function resolveArtifactMimeType(filename: string): string {
    if (filename.endsWith('.webm')) {
        return 'video/webm';
    }

    if (filename.endsWith('.mp4')) {
        return 'video/mp4';
    }

    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        return 'image/jpeg';
    }

    return 'image/png';
}

/**
 * Validates and resolves absolute path for one artifact filename.
 */
function resolveArtifactPath(artifactName: string): string | null {
    if (!isRunBrowserArtifactFilename(artifactName)) {
        return null;
    }

    return resolveRunBrowserArtifactFilesystemPath(artifactName);
}

/**
 * Serves one browser screenshot/video artifact captured by `run_browser`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ artifactName: string }> }) {
    const { artifactName } = await params;
    const artifactPath = resolveArtifactPath(artifactName);

    if (!artifactPath) {
        return NextResponse.json({ error: 'Invalid artifact name.' }, { status: 400 });
    }

    try {
        const artifact = await readFile(artifactPath);

        return new NextResponse(new Uint8Array(artifact), {
            status: 200,
            headers: {
                'Content-Type': resolveArtifactMimeType(artifactName.toLowerCase()),
                'Cache-Control': 'no-store',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });
    }
}
