import { readdir } from 'fs/promises';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';

/**
 * Lists the direct project directories of one agent folder.
 *
 * @param agentFolderPath - Absolute path of the local agent folder.
 * @returns Project directory names, or an empty list when the agent has no projects folder.
 */
export async function listAgentProjectDirectoryNames(agentFolderPath: string): Promise<ReadonlyArray<string>> {
    try {
        const projectsRootEntries = await readdir(join(agentFolderPath, AGENT_PROJECTS_DIRECTORY_PATH), {
            withFileTypes: true,
        });

        return projectsRootEntries
            .filter((projectsRootEntry) => projectsRootEntry.isDirectory())
            .map((projectDirectoryEntry) => projectDirectoryEntry.name);
    } catch {
        return [];
    }
}
