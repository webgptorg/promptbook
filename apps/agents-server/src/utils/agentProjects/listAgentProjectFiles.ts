import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { isMissingPathError } from './isMissingPathError';

/**
 * One file inside an agent project listed for the dashboards.
 */
export type AgentProjectFileEntry = {
    /**
     * File path relative to the project root using `/` separators, for example `src/index.html`.
     */
    readonly relativePath: string;

    /**
     * File size in bytes.
     */
    readonly sizeBytes: number;
};

/**
 * Result of listing files of one project with an upper bound.
 */
export type AgentProjectFileListing = {
    /**
     * Listed files ordered by relative path.
     */
    readonly files: ReadonlyArray<AgentProjectFileEntry>;

    /**
     * Count of files that exceeded the listing limit and were omitted.
     */
    readonly omittedFileCount: number;
};

/**
 * Lists files of one project directory recursively up to the given limit.
 *
 * Symbolic links are skipped, matching the size measurement behavior.
 *
 * @param projectPath - Absolute path of the project directory.
 * @param maxFileCount - Upper bound of listed files.
 * @returns Capped file listing ordered by relative path.
 */
export async function listAgentProjectFiles(
    projectPath: string,
    maxFileCount: number,
): Promise<AgentProjectFileListing> {
    const files: Array<AgentProjectFileEntry> = [];
    let omittedFileCount = 0;

    async function collectFiles(directoryPath: string, relativePathPrefix: string): Promise<void> {
        let directoryEntries;
        try {
            directoryEntries = await readdir(directoryPath, { withFileTypes: true });
        } catch (error) {
            if (isMissingPathError(error)) {
                return;
            }

            throw error;
        }

        const sortedDirectoryEntries = [...directoryEntries].sort((firstEntry, secondEntry) =>
            firstEntry.name.localeCompare(secondEntry.name),
        );

        for (const directoryEntry of sortedDirectoryEntries) {
            if (directoryEntry.isSymbolicLink()) {
                continue;
            }

            const entryPath = join(directoryPath, directoryEntry.name);
            const entryRelativePath = relativePathPrefix
                ? `${relativePathPrefix}/${directoryEntry.name}`
                : directoryEntry.name;

            if (directoryEntry.isDirectory()) {
                await collectFiles(entryPath, entryRelativePath);
                continue;
            }

            if (!directoryEntry.isFile()) {
                continue;
            }

            if (files.length >= maxFileCount) {
                omittedFileCount++;
                continue;
            }

            try {
                const fileStats = await stat(entryPath);
                files.push({ relativePath: entryRelativePath, sizeBytes: fileStats.size });
            } catch (error) {
                if (!isMissingPathError(error)) {
                    throw error;
                }
            }
        }
    }

    await collectFiles(projectPath, '');

    return { files, omittedFileCount };
}
