import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Filesystem usage summary for one project directory.
 */
export type AgentProjectDirectoryUsage = {
    /**
     * Total bytes occupied by regular files and symlink entries.
     */
    readonly sizeBytes: number;

    /**
     * Number of regular files and symlinks counted.
     */
    readonly fileCount: number;

    /**
     * Number of directories visited, including the root directory when it exists.
     */
    readonly directoryCount: number;

    /**
     * Whether a `.git` directory exists at the project root.
     */
    readonly isGitRepository: boolean;

    /**
     * Non-fatal read error, if usage could not be fully measured.
     */
    readonly errorMessage: string | null;
};

/**
 * Reads recursive directory usage for one project.
 *
 * @param directoryPath - Project directory path.
 * @returns Directory usage summary.
 */
export async function readAgentProjectDirectoryUsage(directoryPath: string): Promise<AgentProjectDirectoryUsage> {
    const usage = {
        sizeBytes: 0,
        fileCount: 0,
        directoryCount: 0,
        isGitRepository: false,
    };

    try {
        const rootStats = await lstat(directoryPath);
        if (!rootStats.isDirectory()) {
            return {
                ...usage,
                errorMessage: 'Project path exists but is not a directory.',
            };
        }

        const pendingDirectories = [directoryPath];
        while (pendingDirectories.length > 0) {
            const currentDirectory = pendingDirectories.pop()!;
            usage.directoryCount += 1;
            const entries = await readdir(currentDirectory, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = join(currentDirectory, entry.name);

                if (currentDirectory === directoryPath && entry.name === '.git' && entry.isDirectory()) {
                    usage.isGitRepository = true;
                }

                if (entry.isDirectory()) {
                    pendingDirectories.push(entryPath);
                    continue;
                }

                const entryStats = await lstat(entryPath);
                usage.sizeBytes += entryStats.size;
                usage.fileCount += 1;
            }
        }

        return {
            ...usage,
            errorMessage: null,
        };
    } catch (error) {
        return {
            ...usage,
            errorMessage: error instanceof Error ? error.message : 'Project directory usage is not available.',
        };
    }
}
