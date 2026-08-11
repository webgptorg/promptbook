import { $resolveLatestNpmPackageVersion } from '../npm/$resolveLatestNpmPackageVersion';
import { isNpmPackageVersionOutdated } from '../npm/isNpmPackageVersionOutdated';
import { $resolvePromptbookCliInstallations } from './$resolvePromptbookCliInstallations';
import type { PromptbookCliInstallation } from './PromptbookCliInstallation';
import type {
    PromptbookCliInstallationState,
    PromptbookCliInstallationStatus,
} from './PromptbookCliInstallationStatus';

/**
 * Checks every local and global Promptbook CLI installation against the newest npm version.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads installed packages and queries npm
 *
 * @private internal utility of `promptbookCli`
 */
export async function $checkPromptbookCliInstallations(): Promise<ReadonlyArray<PromptbookCliInstallationStatus>> {
    const installations = await $resolvePromptbookCliInstallations();

    if (installations.length === 0) {
        return [];
    }

    const latestVersionsByNpmPackageName = await $resolveLatestVersionsByNpmPackageName(installations);

    return installations.map((installation) => {
        const latestVersion = latestVersionsByNpmPackageName.get(installation.npmPackageName) ?? null;

        return {
            installation,
            installationState: resolvePromptbookCliInstallationState(installation.installedVersion, latestVersion),
            latestVersion,
        };
    });
}

/**
 * Resolves each package's newest version once, even when it is installed locally and globally.
 */
async function $resolveLatestVersionsByNpmPackageName(
    installations: ReadonlyArray<PromptbookCliInstallation>,
): Promise<ReadonlyMap<PromptbookCliInstallation['npmPackageName'], string | null>> {
    const npmPackageNames = Array.from(new Set(installations.map(({ npmPackageName }) => npmPackageName)));
    const latestVersionEntries = await Promise.all(
        npmPackageNames.map(async (npmPackageName) => {
            const latestVersion = await $resolveLatestNpmPackageVersion(npmPackageName);

            return [npmPackageName, latestVersion] as const;
        }),
    );

    return new Map(latestVersionEntries);
}

/**
 * Derives the update state of one installed Promptbook CLI package.
 */
function resolvePromptbookCliInstallationState(
    installedVersion: string,
    latestVersion: string | null,
): PromptbookCliInstallationState {
    if (latestVersion === null) {
        return 'unknown';
    }

    return isNpmPackageVersionOutdated(installedVersion, latestVersion) ? 'outdated' : 'up-to-date';
}

// Note: [🟡] Code for Promptbook CLI installation check [$checkPromptbookCliInstallations](src/cli/cli-commands/common/promptbook-cli/$checkPromptbookCliInstallations.ts) should never be published outside of `@promptbook/cli`
