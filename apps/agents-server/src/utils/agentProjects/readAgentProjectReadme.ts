import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { isMissingPathError } from './isMissingPathError';

/**
 * README filenames recognized inside project roots, ordered by display priority.
 */
const AGENT_PROJECT_README_FILE_NAMES = ['readme.md', 'readme.markdown', 'readme.txt', 'readme'] as const;

/**
 * README file loaded from one agent project.
 */
export type AgentProjectReadme = {
    /**
     * Original filename used on disk.
     */
    readonly fileName: string;

    /**
     * README content decoded as UTF-8 text.
     */
    readonly content: string;
};

/**
 * Reads the first recognized README file from a project directory.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns README content, or `null` when the project has no recognized README file.
 */
export async function readAgentProjectReadme(projectPath: string): Promise<AgentProjectReadme | null> {
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

    for (const readmeFileName of AGENT_PROJECT_README_FILE_NAMES) {
        const projectReadmeFileName = projectFileNameByNormalizedName.get(readmeFileName);
        if (!projectReadmeFileName) {
            continue;
        }

        try {
            return {
                fileName: projectReadmeFileName,
                content: await readFile(join(projectPath, projectReadmeFileName), 'utf-8'),
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
