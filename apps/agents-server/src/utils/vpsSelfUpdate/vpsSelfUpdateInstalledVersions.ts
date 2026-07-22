import { readdir, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';
import {
    readVpsSelfUpdateConfiguredEnvironmentValue,
    resolveManagedPromptbookRepositoryDirectory,
} from './vpsSelfUpdateConfiguration';
import type { VpsSelfUpdateInstalledVersion } from './vpsSelfUpdateTypes';

/**
 * `.env` variable that stores how many installed Agents Server versions are kept by garbage collection.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const AGENTS_SERVER_GC_KEEP_VERSIONS_ENV_NAME = 'AGENTS_SERVER_GC_KEEP_VERSIONS';

/**
 * Default total number of installed versions kept by garbage collection (the current one plus two previous ones).
 *
 * Note: [🧹] Keep in sync with the `AGENTS_SERVER_GC_KEEP_VERSIONS` default in `install.sh`.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT = 3;

/**
 * Normalizes a raw `AGENTS_SERVER_GC_KEEP_VERSIONS` value into a usable keep count.
 *
 * @param rawValue - Raw `.env` or process environment value.
 * @returns Positive integer keep count, falling back to the default when the value is invalid.
 *
 * @private function of `vpsSelfUpdate`
 */
export function normalizeAgentsServerGcKeepVersionsCount(rawValue: string | null | undefined): number {
    const trimmedValue = rawValue?.trim() || '';

    if (!/^[0-9]+$/u.test(trimmedValue)) {
        return DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT;
    }

    const parsedValue = Number.parseInt(trimmedValue, 10);
    if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
        return DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT;
    }

    return parsedValue;
}

/**
 * Reads how many installed Agents Server versions the garbage collection keeps in total.
 *
 * @returns Positive integer keep count configured via `AGENTS_SERVER_GC_KEEP_VERSIONS` (default 3).
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readAgentsServerGcKeepVersionsCount(): Promise<number> {
    const rawValue = await readVpsSelfUpdateConfiguredEnvironmentValue(AGENTS_SERVER_GC_KEEP_VERSIONS_ENV_NAME);
    return normalizeAgentsServerGcKeepVersionsCount(rawValue);
}

/**
 * Resolves the directory that holds the installed Agents Server versions.
 *
 * @returns Absolute releases directory path or `null` when it cannot be determined.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function resolveVpsSelfUpdateReleasesDirectory(): Promise<string | null> {
    const configuredDirectory =
        (await readVpsSelfUpdateConfiguredEnvironmentValue('PTBK_RELEASES_DIR')) ||
        process.env.PTBK_RELEASES_DIR?.trim() ||
        '';

    if (configuredDirectory) {
        return resolve(configuredDirectory);
    }

    // The installer defaults `PTBK_RELEASES_DIR` to the `bin` directory next to the `.env` file.
    const fallbackDirectory = resolve(dirname(resolveVpsEnvironmentFilePath()), 'bin');
    try {
        const fallbackDirectoryStats = await stat(fallbackDirectory);
        return fallbackDirectoryStats.isDirectory() ? fallbackDirectory : null;
    } catch {
        return null;
    }
}

/**
 * Lists the Agents Server versions installed in the releases directory.
 *
 * Hidden entries (for example `.install-*` staging checkouts) and plain files (for example
 * the `ptbk` launcher) are not versions and are skipped.
 *
 * @returns Installed versions sorted newest first, or an empty list when the releases directory is unavailable.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function listVpsSelfUpdateInstalledVersions(): Promise<ReadonlyArray<VpsSelfUpdateInstalledVersion>> {
    const releasesDirectory = await resolveVpsSelfUpdateReleasesDirectory();
    if (!releasesDirectory) {
        return [];
    }

    const currentRepositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();

    let releaseEntries;
    try {
        releaseEntries = await readdir(releasesDirectory, { withFileTypes: true });
    } catch {
        return [];
    }

    const installedVersions: Array<VpsSelfUpdateInstalledVersion> = [];
    for (const releaseEntry of releaseEntries) {
        if (!releaseEntry.isDirectory() || releaseEntry.name.startsWith('.')) {
            continue;
        }

        const directoryPath = join(releasesDirectory, releaseEntry.name);
        installedVersions.push({
            name: releaseEntry.name,
            directoryPath,
            modifiedAt: await readDirectoryModifiedAt(directoryPath),
            isCurrent: currentRepositoryDirectory !== null && resolve(directoryPath) === currentRepositoryDirectory,
        });
    }

    return installedVersions.sort(compareInstalledVersionsNewestFirst);
}

/**
 * Reads the last modification time of one version directory.
 *
 * @param directoryPath - Absolute version directory path.
 * @returns ISO timestamp or `null` when the directory cannot be inspected.
 */
async function readDirectoryModifiedAt(directoryPath: string): Promise<string | null> {
    try {
        const directoryStats = await stat(directoryPath);
        return directoryStats.mtime.toISOString();
    } catch {
        return null;
    }
}

/**
 * Sorts installed versions with the current one first and then newest first.
 *
 * @param versionA - First compared version.
 * @param versionB - Second compared version.
 * @returns Standard comparator result.
 */
function compareInstalledVersionsNewestFirst(
    versionA: VpsSelfUpdateInstalledVersion,
    versionB: VpsSelfUpdateInstalledVersion,
): number {
    if (versionA.isCurrent !== versionB.isCurrent) {
        return versionA.isCurrent ? -1 : 1;
    }

    return (versionB.modifiedAt || '').localeCompare(versionA.modifiedAt || '');
}
