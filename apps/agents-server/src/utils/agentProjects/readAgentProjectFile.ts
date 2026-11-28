import { readFile, stat } from 'fs/promises';
import { basename } from 'path';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { resolveSafeAgentProjectFilePath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { resolveAgentProjectFileContentType } from './resolveAgentProjectFileContentType';

/**
 * One agent project file loaded for an HTTP response.
 */
export type AgentProjectFile = {
    /**
     * Raw file content.
     */
    readonly content: Buffer;

    /**
     * Response content type resolved from the filename.
     */
    readonly contentType: string;

    /**
     * Filename of the served file.
     */
    readonly fileName: string;
};

/**
 * Reads one file of one agent project for serving over HTTP.
 *
 * @param options - Agent permanent id, project name, and file path segments from the URL.
 * @returns Loaded file with resolved content type.
 * @throws {NotAllowed} When the project name or file path attempts path traversal.
 * @throws {NotFoundError} When the file does not exist or is not a regular file.
 */
export async function readAgentProjectFile(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly filePathSegments: ReadonlyArray<string>;
}): Promise<AgentProjectFile> {
    const filePath = resolveSafeAgentProjectFilePath(options);
    const fileName = basename(filePath);

    try {
        const fileStats = await stat(filePath);

        if (!fileStats.isFile()) {
            throw createProjectFileNotFoundError(options);
        }

        return {
            content: await readFile(filePath),
            contentType: resolveAgentProjectFileContentType(fileName),
            fileName,
        };
    } catch (error) {
        if (isMissingPathError(error)) {
            throw createProjectFileNotFoundError(options);
        }

        throw error;
    }
}

/**
 * Creates the branded not-found error for one missing project file.
 */
function createProjectFileNotFoundError(options: {
    readonly projectName: string;
    readonly filePathSegments: ReadonlyArray<string>;
}): NotFoundError {
    return new NotFoundError(
        spaceTrim(`
            File \`${options.filePathSegments.join('/')}\` was not found in project \`${options.projectName}\`.
        `),
    );
}
