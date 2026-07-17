import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { isMissingPathError } from './isMissingPathError';

/**
 * Aggregated filesystem usage of one directory tree.
 */
export type DirectoryUsage = {
    /**
     * Total size of all regular files in bytes.
     */
    readonly sizeBytes: number;

    /**
     * Total count of regular files.
     */
    readonly fileCount: number;

    /**
     * Unix timestamp (milliseconds) of the most recently modified file, or `null` when there are no files.
     */
    readonly latestModifiedAtMs: number | null;
};

/**
 * Empty usage returned for missing or empty directories.
 */
const EMPTY_DIRECTORY_USAGE: DirectoryUsage = {
    sizeBytes: 0,
    fileCount: 0,
    latestModifiedAtMs: null,
};

/**
 * Recursively measures total file size, file count, and latest modification of one directory.
 *
 * Symbolic links are skipped so the measurement cannot escape the directory or loop forever.
 * A missing directory is reported as empty usage instead of an error.
 *
 * @param directoryPath - Absolute directory path to measure.
 * @returns Aggregated usage of the directory tree.
 */
export async function measureDirectoryUsage(directoryPath: string): Promise<DirectoryUsage> {
    let directoryEntries;
    try {
        directoryEntries = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            return EMPTY_DIRECTORY_USAGE;
        }

        throw error;
    }

    const entryUsages = await Promise.all(
        directoryEntries.map(async (directoryEntry): Promise<DirectoryUsage> => {
            const entryPath = join(directoryPath, directoryEntry.name);

            if (directoryEntry.isSymbolicLink()) {
                return EMPTY_DIRECTORY_USAGE;
            }

            if (directoryEntry.isDirectory()) {
                return measureDirectoryUsage(entryPath);
            }

            if (!directoryEntry.isFile()) {
                return EMPTY_DIRECTORY_USAGE;
            }

            try {
                const fileStats = await stat(entryPath);
                return {
                    sizeBytes: fileStats.size,
                    fileCount: 1,
                    latestModifiedAtMs: fileStats.mtimeMs,
                };
            } catch (error) {
                if (isMissingPathError(error)) {
                    return EMPTY_DIRECTORY_USAGE;
                }

                throw error;
            }
        }),
    );

    return entryUsages.reduce(mergeDirectoryUsages, EMPTY_DIRECTORY_USAGE);
}

/**
 * Merges two directory usages into one aggregate.
 */
function mergeDirectoryUsages(firstUsage: DirectoryUsage, secondUsage: DirectoryUsage): DirectoryUsage {
    return {
        sizeBytes: firstUsage.sizeBytes + secondUsage.sizeBytes,
        fileCount: firstUsage.fileCount + secondUsage.fileCount,
        latestModifiedAtMs:
            firstUsage.latestModifiedAtMs === null
                ? secondUsage.latestModifiedAtMs
                : secondUsage.latestModifiedAtMs === null
                ? firstUsage.latestModifiedAtMs
                : Math.max(firstUsage.latestModifiedAtMs, secondUsage.latestModifiedAtMs),
    };
}
