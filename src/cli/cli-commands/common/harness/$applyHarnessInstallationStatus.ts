import colors from 'colors';
import { $askForNpmPackageInstallationApproval } from '../npm/$askForNpmPackageInstallationApproval';
import { $installHarness } from './$installHarness';
import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';
import { formatHarnessInstallationWarning } from './formatHarnessInstallationWarning';

/**
 * Reports one detected harness installation status and offers to install or update the harness.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it asks the user and installs npm packages
 *
 * @private internal utility of `promptbookCli`
 */
export async function $applyHarnessInstallationStatus(status: HarnessInstallationStatus): Promise<void> {
    const { definition, installationState, installedVersion, latestVersion } = status;

    if (installationState === 'up-to-date') {
        console.info(colors.gray(`✔ ${definition.label} ${installedVersion} is up to date.`));
        return;
    }

    if (installationState === 'unknown') {
        console.info(
            colors.gray(
                `✔ ${definition.label} ${installedVersion} is installed, the newest version could not be checked.`,
            ),
        );
        return;
    }

    console.warn(colors.yellow(formatHarnessInstallationWarning(status)));

    const isInstallationApproved = await $askForNpmPackageInstallationApproval(
        installationState === 'not-installed'
            ? `Install ${definition.label} globally now?`
            : `Update ${definition.label} to ${latestVersion} now?`,
    );

    if (!isInstallationApproved) {
        console.info(colors.gray(`Skipped, run \`${buildHarnessInstallCommand(definition)}\` to do it manually.`));
        return;
    }

    await $installHarness(definition);
}

// Note: [🟡] Code for CLI harness installation handling [$applyHarnessInstallationStatus](src/cli/cli-commands/common/harness/$applyHarnessInstallationStatus.ts) should never be published outside of `@promptbook/cli`
