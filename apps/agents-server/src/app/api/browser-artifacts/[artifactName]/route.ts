import { readFile } from 'fs/promises';
import { relative, resolve } from 'path';
import { NextResponse } from 'next/server';

/**
 * Local directory used by `run_browser` to store captured artifacts.
 */
const RUN_BROWSER_ARTIFACT_DIRECTORY = '.playwright-cli';

/**
 * Whitelist for browser artifact filenames produced by `run_browser`.
 */
const RUN_BROWSER_ARTIFACT_FILENAME_PATTERN =
    /^agents-server-run-browser-[a-f0-9-]+(?:-[a-z0-9-]+)?\.(png|jpg|jpeg|webm|mp4)$/;

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
    if (!RUN_BROWSER_ARTIFACT_FILENAME_PATTERN.test(artifactName)) {
        return null;
    }

    const artifactsDirectory = resolve(process.cwd(), RUN_BROWSER_ARTIFACT_DIRECTORY);
    const artifactPath = resolve(artifactsDirectory, artifactName);
    const relativePath = relative(artifactsDirectory, artifactPath);

    if (!relativePath || relativePath.startsWith('..') || relativePath.includes(':')) {
        return null;
    }

    return artifactPath;
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
