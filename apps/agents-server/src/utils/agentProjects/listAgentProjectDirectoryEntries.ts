import type { Dirent } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { resolveSafeAgentProjectDirectoryPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';

/**
 * Directory name used by git repositories for internal metadata.
 */
const GIT_DIRECTORY_NAME = '.git';

/**
 * One entry in the currently browsed project directory.
 */
export type AgentProjectDirectoryEntry = {
    /**
     * Entry name inside the current directory.
     */
    readonly name: string;

    /**
     * Entry path relative to the project root using `/` separators.
     */
    readonly relativePath: string;

    /**
     * Whether this entry is a folder or a file.
     */
    readonly kind: 'directory' | 'file';

    /**
     * File size in bytes, or `null` for directories.
     */
    readonly sizeBytes: number | null;

    /**
     * ISO timestamp of the entry modification time, or `null` when unavailable.
     */
    readonly latestModifiedAt: string | null;
};

/**
 * Current-folder project directory listing.
 */
export type AgentProjectDirectoryListing = {
    /**
     * Path segments of the directory currently being browsed.
     */
    readonly directoryPathSegments: ReadonlyArray<string>;

    /**
     * Directory path relative to the project root using `/` separators.
     */
    readonly directoryRelativePath: string;

    /**
     * Entries directly inside the current directory.
     */
    readonly entries: ReadonlyArray<AgentProjectDirectoryEntry>;
};

/**
 * Lists direct file and folder entries in one project directory.
 *
 * @param options - Agent, project, and folder path to browse.
 * @returns Current-folder directory listing.
 * @throws {NotFoundError} When the selected folder does not exist.
 */
export async function listAgentProjectDirectoryEntries(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly directoryPathSegments: ReadonlyArray<string>;
}): Promise<AgentProjectDirectoryListing> {
    const directoryPath = resolveSafeAgentProjectDirectoryPath(options);
    const directoryRelativePath = options.directoryPathSegments.join('/');

    let directoryEntries;
    try {
        directoryEntries = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            throw createProjectDirectoryNotFoundError(options);
        }

        throw error;
    }

    const entries = (
        await Promise.all(
            directoryEntries
                .filter((directoryEntry) => !directoryEntry.isSymbolicLink() && directoryEntry.name !== GIT_DIRECTORY_NAME)
                .map(async (directoryEntry): Promise<AgentProjectDirectoryEntry | null> => {
                    const entryKind = resolveDirectoryEntryKind(directoryEntry);
                    if (!entryKind) {
                        return null;
                    }

                    const relativePath = directoryRelativePath
                        ? `${directoryRelativePath}/${directoryEntry.name}`
                        : directoryEntry.name;
                    const entryPath = join(directoryPath, directoryEntry.name);

                    try {
                        const entryStats = await stat(entryPath);

                        return {
                            name: directoryEntry.name,
                            relativePath,
                            kind: entryKind,
                            sizeBytes: entryKind === 'file' ? entryStats.size : null,
                            latestModifiedAt: entryStats.mtimeMs
                                ? new Date(entryStats.mtimeMs).toISOString()
                                : null,
                        };
                    } catch (error) {
                        if (isMissingPathError(error)) {
                            return null;
                        }

                        throw error;
                    }
                }),
        )
    )
        .filter((entry): entry is AgentProjectDirectoryEntry => entry !== null)
        .sort(compareAgentProjectDirectoryEntries);

    return {
        directoryPathSegments: options.directoryPathSegments,
        directoryRelativePath,
        entries,
    };
}

/**
 * Resolves a supported directory-entry kind.
 *
 * @param directoryEntry - Node directory entry.
 * @returns Entry kind or `null` for unsupported filesystem entries.
 */
function resolveDirectoryEntryKind(directoryEntry: Dirent): 'directory' | 'file' | null {
    if (directoryEntry.isDirectory()) {
        return 'directory';
    }

    if (directoryEntry.isFile()) {
        return 'file';
    }

    return null;
}

/**
 * Sorts folders before files and then by entry name.
 *
 * @param firstEntry - First entry.
 * @param secondEntry - Second entry.
 * @returns Sort order.
 */
function compareAgentProjectDirectoryEntries(
    firstEntry: AgentProjectDirectoryEntry,
    secondEntry: AgentProjectDirectoryEntry,
): number {
    if (firstEntry.kind !== secondEntry.kind) {
        return firstEntry.kind === 'directory' ? -1 : 1;
    }

    return firstEntry.name.localeCompare(secondEntry.name);
}

/**
 * Creates a branded not-found error for a missing project directory.
 *
 * @param options - Agent, project, and directory path that was requested.
 * @returns Branded not-found error.
 */
function createProjectDirectoryNotFoundError(options: {
    readonly projectName: string;
    readonly directoryPathSegments: ReadonlyArray<string>;
}): NotFoundError {
    return new NotFoundError(
        spaceTrim(`
            Directory \`${options.directoryPathSegments.join('/') || '.'}\` was not found in project \`${options.projectName}\`.
        `),
    );
}
