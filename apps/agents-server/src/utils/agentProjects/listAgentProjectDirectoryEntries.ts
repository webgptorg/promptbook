import { lstat, readdir } from 'node:fs/promises';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import { resolveAgentProjectFilePath } from './resolveAgentProjectDirectory';

/**
 * Default maximum entries returned by one directory listing.
 */
const PROJECT_DIRECTORY_LISTING_DEFAULT_MAX_ENTRIES = 300;

/**
 * One listed project directory entry.
 */
export type AgentProjectDirectoryEntry = {
    readonly name: string;
    readonly path: string;
    readonly type: 'directory' | 'file' | 'symlink';
    readonly sizeBytes: number;
    readonly updatedAt: string;
};

/**
 * Result of one project directory listing.
 */
export type AgentProjectDirectoryListing = {
    /**
     * Normalized project-relative path of the listed directory. Empty string means project root.
     */
    readonly path: string;

    /**
     * Listed entries, directories first, each group sorted by name.
     */
    readonly entries: ReadonlyArray<AgentProjectDirectoryEntry>;

    /**
     * Total number of entries before truncation.
     */
    readonly totalEntryCount: number;

    /**
     * Whether the listing was truncated to the maximum entry count.
     */
    readonly isTruncated: boolean;
};

/**
 * Lists entries of one directory inside a project folder.
 *
 * @param projectDirectoryPath - Project directory path.
 * @param rawRelativePath - Project-relative directory path, empty for the project root.
 * @param options - Optional maximum entry count.
 * @returns Sorted and truncated directory listing.
 */
export async function listAgentProjectDirectoryEntries(
    projectDirectoryPath: string,
    rawRelativePath: unknown = '',
    options: { readonly maxEntries?: number } = {},
): Promise<AgentProjectDirectoryListing> {
    const maxEntries = options.maxEntries ?? PROJECT_DIRECTORY_LISTING_DEFAULT_MAX_ENTRIES;
    const { absolutePath, relativePath } = resolveAgentProjectFilePath(projectDirectoryPath, rawRelativePath ?? '', {
        isEmptyPathAllowed: true,
    });

    const directoryStats = await lstat(absolutePath);
    if (!directoryStats.isDirectory()) {
        throw new ParseError(
            spaceTrim(`
                Project path is not a directory.

                - Requested path: \`${relativePath || '.'}\`
            `),
        );
    }

    const entries = await readdir(absolutePath, { withFileTypes: true });
    const sortedEntries = [...entries].sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
            return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
    });
    const limitedEntries = sortedEntries.slice(0, maxEntries);
    const payloadEntries = await Promise.all(
        limitedEntries.map(async (entry) => {
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            const { absolutePath: entryAbsolutePath } = resolveAgentProjectFilePath(
                projectDirectoryPath,
                entryRelativePath,
            );
            const entryStats = await lstat(entryAbsolutePath);
            return {
                name: entry.name,
                path: entryRelativePath,
                type: entry.isDirectory()
                    ? ('directory' as const)
                    : entry.isSymbolicLink()
                    ? ('symlink' as const)
                    : ('file' as const),
                sizeBytes: entryStats.size,
                updatedAt: entryStats.mtime.toISOString(),
            };
        }),
    );

    return {
        path: relativePath,
        entries: payloadEntries,
        totalEntryCount: sortedEntries.length,
        isTruncated: sortedEntries.length > limitedEntries.length,
    };
}
