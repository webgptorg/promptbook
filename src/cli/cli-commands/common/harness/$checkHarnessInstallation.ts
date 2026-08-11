import { $resolveInstalledHarnessVersion } from './$resolveInstalledHarnessVersion';
import { $resolveLatestHarnessVersion } from './$resolveLatestHarnessVersion';
import type { HarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationState, HarnessInstallationStatus } from './HarnessInstallationStatus';
import { isHarnessVersionOutdated } from './isHarnessVersionOutdated';

/**
 * Detects whether one CLI coding harness is installed globally and whether it is up to date.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs the harness command and queries npm
 *
 * @private internal utility of `promptbookCli`
 */
export async function $checkHarnessInstallation(definition: HarnessDefinition): Promise<HarnessInstallationStatus> {
    const [installedVersion, latestVersion] = await Promise.all([
        $resolveInstalledHarnessVersion(definition),
        $resolveLatestHarnessVersion(definition),
    ]);

    return {
        definition,
        installationState: resolveHarnessInstallationState(installedVersion, latestVersion),
        installedVersion,
        latestVersion,
    };
}

/**
 * Derives the installation state from the detected versions.
 */
function resolveHarnessInstallationState(
    installedVersion: string | null,
    latestVersion: string | null,
): HarnessInstallationState {
    if (installedVersion === null) {
        return 'not-installed';
    }

    if (latestVersion === null) {
        return 'unknown';
    }

    return isHarnessVersionOutdated(installedVersion, latestVersion) ? 'outdated' : 'up-to-date';
}

// Note: [🟡] Code for CLI harness installation check [$checkHarnessInstallation](src/cli/cli-commands/common/harness/$checkHarnessInstallation.ts) should never be published outside of `@promptbook/cli`
