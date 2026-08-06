import { stat } from 'fs/promises';
import { join, posix } from 'path';
import { isMissingPathError } from './isMissingPathError';
import { resolveAgentProjectFileContentType } from './resolveAgentProjectFileContentType';

/**
 * Conventional favicon filenames checked when an HTML entrypoint does not declare an existing icon.
 */
const AGENT_PROJECT_FAVICON_FILE_NAMES = [
    'favicon.ico',
    'favicon.png',
    'favicon.svg',
    'favicon.webp',
    'favicon.jpg',
    'favicon.jpeg',
    'favicon.gif',
] as const;

/**
 * Resolves the first existing local favicon of one project.
 *
 * @param options - Project root and favicon paths declared by its HTML entrypoint.
 * @returns Project-relative favicon path, or null when no image favicon is available.
 */
export async function resolveAgentProjectFaviconRelativePath(options: {
    readonly projectPath: string;
    readonly faviconRelativePaths: ReadonlyArray<string>;
}): Promise<string | null> {
    const candidateRelativePaths = [...new Set([...options.faviconRelativePaths, ...AGENT_PROJECT_FAVICON_FILE_NAMES])];

    for (const candidateRelativePath of candidateRelativePaths) {
        if (!isSafeFaviconRelativePath(candidateRelativePath)) {
            continue;
        }

        const isFaviconFile = await isAgentProjectFaviconFile(options.projectPath, candidateRelativePath);
        if (isFaviconFile) {
            return candidateRelativePath;
        }
    }

    return null;
}

/**
 * Returns whether a path is a safe local project path that resolves to an image content type.
 *
 * @param relativePath - Candidate project-relative file path.
 * @returns True when the path can safely identify a favicon file.
 */
function isSafeFaviconRelativePath(relativePath: string): boolean {
    return (
        Boolean(relativePath) &&
        relativePath === posix.normalize(relativePath) &&
        !relativePath.startsWith('/') &&
        !relativePath.startsWith('../') &&
        !relativePath.includes('\\') &&
        resolveAgentProjectFileContentType(relativePath).startsWith('image/')
    );
}

/**
 * Returns whether a candidate path exists as a regular file in the project directory.
 *
 * @param projectPath - Absolute path of the project directory.
 * @param relativePath - Safe project-relative favicon path.
 * @returns True when the candidate exists as a file.
 */
async function isAgentProjectFaviconFile(projectPath: string, relativePath: string): Promise<boolean> {
    try {
        return (await stat(join(projectPath, ...relativePath.split('/')))).isFile();
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }

        throw error;
    }
}
