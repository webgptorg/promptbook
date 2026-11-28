import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { isMissingPathError } from './isMissingPathError';

/**
 * Text file loaded from the root of one agent project.
 */
export type AgentProjectRootTextFile = {
    /**
     * Original filename used on disk.
     */
    readonly fileName: string;

    /**
     * File content decoded as UTF-8 text.
     */
    readonly content: string;
};

/**
 * Reads the first recognized text file from the root of one project directory.
 *
 * Project files are written by the agent, so their filename casing cannot be relied on — the
 * recognized filenames are matched case-insensitively and the real filename on disk is preserved.
 *
 * @param projectPath - Absolute path of the project directory.
 * @param recognizedFileNames - Lowercase filenames ordered by priority.
 * @returns Content of the first matching file, or `null` when the project has none of them.
 */
export async function readAgentProjectRootTextFile(
    projectPath: string,
    recognizedFileNames: ReadonlyArray<string>,
): Promise<AgentProjectRootTextFile | null> {
    let projectRootEntries;

    try {
        projectRootEntries = await readdir(projectPath, { withFileTypes: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            return null;
        }

        throw error;
    }

    const projectFileNameByNormalizedName = new Map(
        projectRootEntries
            .filter((projectRootEntry) => projectRootEntry.isFile())
            .map((projectRootEntry) => [projectRootEntry.name.toLowerCase(), projectRootEntry.name]),
    );

    for (const recognizedFileName of recognizedFileNames) {
        const projectFileName = projectFileNameByNormalizedName.get(recognizedFileName.toLowerCase());
        if (!projectFileName) {
            continue;
        }

        try {
            return {
                fileName: projectFileName,
                content: await readFile(join(projectPath, projectFileName), 'utf-8'),
            };
        } catch (error) {
            if (isMissingPathError(error)) {
                return null;
            }

            throw error;
        }
    }

    return null;
}
