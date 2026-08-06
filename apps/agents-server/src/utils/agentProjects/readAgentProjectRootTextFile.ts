import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { isMissingPathError } from './isMissingPathError';

/**
 * Text file loaded from an agent project's root directory.
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
 * Options for loading one recognized root-level project text file.
 */
type ReadAgentProjectRootTextFileOptions = {
    /**
     * Absolute path of the project directory.
     */
    readonly projectPath: string;

    /**
     * Recognized filenames ordered by priority.
     */
    readonly fileNames: ReadonlyArray<string>;
};

/**
 * Reads the first matching root-level text file without requiring a particular filename casing.
 *
 * @param options - Project directory and recognized filenames.
 * @returns Matching text file, or null when no recognized file is present.
 */
export async function readAgentProjectRootTextFile(
    options: ReadAgentProjectRootTextFileOptions,
): Promise<AgentProjectRootTextFile | null> {
    let projectRootEntries;

    try {
        projectRootEntries = await readdir(options.projectPath, { withFileTypes: true });
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

    for (const fileName of options.fileNames) {
        const projectFileName = projectFileNameByNormalizedName.get(fileName.toLowerCase());
        if (!projectFileName) {
            continue;
        }

        try {
            return {
                fileName: projectFileName,
                content: await readFile(join(options.projectPath, projectFileName), 'utf-8'),
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
