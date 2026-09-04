import colors from 'colors';
import { $askForNpmPackageInstallationApproval } from '../npm/$askForNpmPackageInstallationApproval';
import { $runHarnessInstallationCommand } from './$runHarnessInstallationCommand';
import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import type { HarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';
import { formatHarnessInstallationWarning } from './formatHarnessInstallationWarning';
import { formatHarnessManualUpdateInstruction } from './formatHarnessManualUpdateInstruction';
import { resolveHarnessUpdatePlan } from './resolveHarnessUpdatePlan';

/**
 * Reports one detected harness installation status and offers to install or update the harness.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it asks the user and installs software
 *
 * @private internal utility of `promptbookCli`
 */
export async function $applyHarnessInstallationStatus(status: HarnessInstallationStatus): Promise<void> {
    const { definition, installationState, installedVersion } = status;

    if (installationState === 'up-to-date') {
        console.info(colors.gray(`✔ ${definition.label} ${installedVersion} is up to date.`));
        return;
    }

    if (installationState === 'installed') {
        console.info(
            colors.gray(`✔ ${definition.label} ${installedVersion} is installed. Skipped checking for updates.`),
        );
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

    if (installationState === 'not-installed') {
        await $applyMissingHarnessInstallation(definition);
        return;
    }

    await $applyOutdatedHarnessInstallation(status);
}

/**
 * Offers to install a missing harness globally through npm.
 */
async function $applyMissingHarnessInstallation(definition: HarnessDefinition): Promise<void> {
    const installCommand = buildHarnessInstallCommand(definition);

    const isInstallationApproved = await $askForNpmPackageInstallationApproval(
        `Install ${definition.label} globally now?`,
    );

    if (!isInstallationApproved) {
        console.info(colors.gray(`Skipped, run \`${installCommand}\` to do it manually.`));
        return;
    }

    await $runHarnessInstallationCommand({
        definition,
        operation: 'install',
        command: installCommand,
        environment: definition.npmInstallEnvironment,
    });
}

/**
 * Offers to update an outdated harness exactly where it is installed.
 */
async function $applyOutdatedHarnessInstallation(status: HarnessInstallationStatus): Promise<void> {
    const { definition, latestVersion, installationOrigin } = status;
    const updatePlan = resolveHarnessUpdatePlan(definition, installationOrigin.installationMethod);

    if (updatePlan.command === null || !updatePlan.isRunnableByPromptbook) {
        console.info(colors.gray(formatHarnessManualUpdateInstruction(status, updatePlan)));
        return;
    }

    const isUpdateApproved = await $askForNpmPackageInstallationApproval(
        `Update ${definition.label} to ${latestVersion} with \`${updatePlan.command}\` now?`,
    );

    if (!isUpdateApproved) {
        console.info(colors.gray(`Skipped, run \`${updatePlan.command}\` to do it manually.`));
        return;
    }

    await $runHarnessInstallationCommand({
        definition,
        operation: 'update',
        command: updatePlan.command,
        environment: updatePlan.environment,
    });
}

// Note: [🟡] Code for CLI harness installation handling [$applyHarnessInstallationStatus](src/cli/cli-commands/common/harness/$applyHarnessInstallationStatus.ts) should never be published outside of `@promptbook/cli`
