import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';
import { resolveAgentMessageTouchedProjectNames } from '../../../src/utils/agent-message-runtime/resolveAgentMessageTouchedProjectNames';

/**
 * Resolves which agent projects one answered message viewed or edited.
 *
 * The runtime log is deleted as soon as the harness run finishes, so this must be called while
 * the log still exists — the Agents Server later shows the reported projects as chips below the
 * answer. Reporting touched projects is best-effort telemetry: an unreadable log or projects
 * folder simply yields no projects instead of failing the already answered message.
 *
 * @param options - Agent folder path and the live runtime log path of the answered message.
 * @returns Touched project directory names, ordered by first appearance in the run.
 */
export async function resolveTouchedAgentProjects(options: {
    readonly projectPath: string;
    readonly runtimeLogPath: string;
}): Promise<ReadonlyArray<string>> {
    const [logText, knownProjectNames] = await Promise.all([
        readOptionalTextFile(options.runtimeLogPath),
        listAgentProjectDirectoryNames(options.projectPath),
    ]);

    return resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames });
}

/**
 * Lists the direct project directories of one agent folder.
 *
 * @param projectPath - Absolute path of the local agent folder.
 * @returns Project directory names, or an empty list when the agent has no projects folder.
 *
 * @private helper of `resolveTouchedAgentProjects`
 */
async function listAgentProjectDirectoryNames(projectPath: string): Promise<ReadonlyArray<string>> {
    try {
        const projectsRootEntries = await readdir(join(projectPath, AGENT_PROJECTS_DIRECTORY_PATH), {
            withFileTypes: true,
        });

        return projectsRootEntries
            .filter((projectsRootEntry) => projectsRootEntry.isDirectory())
            .map((projectDirectoryEntry) => projectDirectoryEntry.name);
    } catch {
        return [];
    }
}

/**
 * Reads one text file and treats a missing runtime log as "nothing was recorded".
 *
 * @param filePath - Absolute path of the file to read.
 * @returns File content, or `null` when it cannot be read.
 *
 * @private helper of `resolveTouchedAgentProjects`
 */
async function readOptionalTextFile(filePath: string): Promise<string | null> {
    try {
        return await readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}
