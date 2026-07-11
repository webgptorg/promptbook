import { rm, stat } from 'fs/promises';
import { resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { readPersistedVpsSelfUpdateJob } from './readPersistedVpsSelfUpdateJob';
import { resolveManagedPromptbookRepositoryDirectory } from './vpsSelfUpdateConfiguration';
import { resolveVpsSelfUpdateReleasesDirectory } from './vpsSelfUpdateInstalledVersions';

/**
 * Deletes one old installed Agents Server version from the releases directory.
 *
 * Only non-current version directories inside the releases directory can be deleted,
 * and never while a self-update job is running (the installer may be using them).
 *
 * @param versionName - Release directory name shown on the Update page (e.g. `10dbbe7`).
 *
 * @private function of `vpsSelfUpdate`
 */
export async function deleteVpsSelfUpdateInstalledVersion(versionName: string): Promise<void> {
    if (process.platform !== 'linux') {
        throw new NotAllowed(
            spaceTrim(`
                Installed Agents Server versions can be deleted only on the standalone Linux VPS deployment.
            `),
        );
    }

    const normalizedVersionName = versionName?.trim() || '';
    if (!/^[A-Za-z0-9._-]+$/u.test(normalizedVersionName) || normalizedVersionName.startsWith('.')) {
        throw new NotAllowed(
            spaceTrim(`
                The version name \`${versionName}\` is not a valid installed version.

                **Version names contain only letters, digits, dots, underscores, and dashes and do not start with a dot.**
            `),
        );
    }

    const currentJob = await readPersistedVpsSelfUpdateJob({ isLogTailIncluded: false });
    if (currentJob.status === 'running' && !currentJob.isStale) {
        throw new NotAllowed(
            spaceTrim(`
                Installed versions cannot be deleted while a standalone VPS self-update is running.
            `),
        );
    }

    const releasesDirectory = await resolveVpsSelfUpdateReleasesDirectory();
    if (!releasesDirectory) {
        throw new NotAllowed(
            spaceTrim(`
                The releases directory with installed Agents Server versions could not be resolved on this server.
            `),
        );
    }

    const versionDirectory = resolve(releasesDirectory, normalizedVersionName);
    const currentRepositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    if (currentRepositoryDirectory !== null && versionDirectory === currentRepositoryDirectory) {
        throw new NotAllowed(
            spaceTrim(`
                The version \`${normalizedVersionName}\` is the currently deployed Agents Server version and cannot be deleted.
            `),
        );
    }

    try {
        const versionDirectoryStats = await stat(versionDirectory);
        if (!versionDirectoryStats.isDirectory()) {
            throw new Error('Not a directory');
        }
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                The version \`${normalizedVersionName}\` is not installed in the releases directory.
            `),
        );
    }

    await rm(versionDirectory, { recursive: true, force: true });
}
