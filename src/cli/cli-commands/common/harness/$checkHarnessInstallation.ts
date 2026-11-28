import { $resolveInstalledHarnessVersion } from './$resolveInstalledHarnessVersion';
import { $resolveLatestNpmPackageVersion } from '../npm/$resolveLatestNpmPackageVersion';
import { isNpmPackageVersionOutdated } from '../npm/isNpmPackageVersionOutdated';
import { $resolveHarnessInstallationOrigin } from './$resolveHarnessInstallationOrigin';
import type { HarnessDefinition } from './HarnessDefinition';
import { UNKNOWN_HARNESS_INSTALLATION_ORIGIN } from './HarnessInstallationOrigin';
import type { HarnessInstallationState, HarnessInstallationStatus } from './HarnessInstallationStatus';

/**
 * Detects whether one CLI coding harness is installed globally and, when enabled, whether it is up to date.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs the harness command and may query npm
 *
 * @private internal utility of `promptbookCli`
 */
export async function $checkHarnessInstallation(
    definition: HarnessDefinition,
    isHarnessUpdateCheckEnabled = true,
): Promise<HarnessInstallationStatus> {
    // Note: The origin is only needed to update an outdated harness, so it is not looked up without the update check
    const [installedVersion, latestVersion, installationOrigin] = await Promise.all([
        $resolveInstalledHarnessVersion(definition),
        isHarnessUpdateCheckEnabled
            ? $resolveLatestNpmPackageVersion(definition.npmPackageName)
            : Promise.resolve(null),
        isHarnessUpdateCheckEnabled
            ? $resolveHarnessInstallationOrigin(definition)
            : Promise.resolve(UNKNOWN_HARNESS_INSTALLATION_ORIGIN),
    ]);

    return {
        definition,
        installationState: resolveHarnessInstallationState(
            installedVersion,
            latestVersion,
            isHarnessUpdateCheckEnabled,
        ),
        installedVersion,
        latestVersion,
        installationOrigin,
    };
}

/**
 * Derives the installation state from the detected versions.
 */
function resolveHarnessInstallationState(
    installedVersion: string | null,
    latestVersion: string | null,
    isHarnessUpdateCheckEnabled: boolean,
): HarnessInstallationState {
    if (installedVersion === null) {
        return 'not-installed';
    }

    if (!isHarnessUpdateCheckEnabled) {
        return 'installed';
    }

    if (latestVersion === null) {
        return 'unknown';
    }

    return isNpmPackageVersionOutdated(installedVersion, latestVersion, { isPrereleaseIgnored: true })
        ? 'outdated'
        : 'up-to-date';
}

// Note: [🟡] Code for CLI harness installation check [$checkHarnessInstallation](src/cli/cli-commands/common/harness/$checkHarnessInstallation.ts) should never be published outside of `@promptbook/cli`
