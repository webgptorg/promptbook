import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { $askForNpmPackageInstallationApproval } from '../npm/$askForNpmPackageInstallationApproval';
import { $checkPromptbookCliInstallations } from './$checkPromptbookCliInstallations';
import { $updatePromptbookCliInstallation } from './$updatePromptbookCliInstallation';
import { buildPromptbookCliInstallCommand } from './buildPromptbookCliInstallCommand';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';
import { formatPromptbookCliInstallationWarning } from './formatPromptbookCliInstallationWarning';

/**
 * Checks local and global Promptbook CLI installations before an interactive coder run and offers to update them.
 *
 * Once an update succeeds, the caller must stop the current run and let the user start a fresh process. A local npm
 * update can modify `package.json` and a lockfile, which would make the coder's clean-working-tree preflight fail;
 * the current Node.js process has also already loaded the old CLI implementation.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads package manifests, queries npm,
 * asks the user, and may install npm packages
 *
 * @returns `true` when at least one installation was updated and the current coder run should stop
 * @private internal utility of `promptbookCli`
 */
export async function $ensurePromptbookCliInstallations(): Promise<boolean> {
    if (!process.stdin.isTTY) {
        // Note: Non-interactive runs cannot approve an update and should not wait for registry checks
        return false;
    }

    const statuses = await $checkPromptbookCliInstallations();
    const outdatedStatuses = statuses.filter(({ installationState }) => installationState === 'outdated');

    if (outdatedStatuses.length === 0) {
        reportPromptbookCliInstallationStatuses(statuses);
        return false;
    }

    console.warn(colors.yellow(formatPromptbookCliInstallationWarning(outdatedStatuses)));

    const isUpdateApproved = await $askForNpmPackageInstallationApproval('Update Promptbook CLI now?');

    if (!isUpdateApproved) {
        reportManualPromptbookCliUpdateCommands(outdatedStatuses);
        return false;
    }

    const updateResults: Array<boolean> = [];

    for (const status of outdatedStatuses) {
        updateResults.push(await $updatePromptbookCliInstallation(status));
    }

    const isAnyInstallationUpdated = updateResults.some(Boolean);
    const isEveryInstallationUpdated = updateResults.every(Boolean);

    if (!isAnyInstallationUpdated) {
        console.info(colors.gray('Promptbook CLI could not be updated; continuing with the installed version.'));
        return false;
    }

    console.info(
        isEveryInstallationUpdated
            ? colors.green('Promptbook CLI update is complete. Run the command again to use the new version.')
            : colors.yellow(
                  'Some Promptbook CLI installations were updated. Resolve the errors above, then run the command again.',
              ),
    );
    return true;
}

/**
 * Reports successful and unverifiable Promptbook CLI checks when no update is required.
 */
function reportPromptbookCliInstallationStatuses(statuses: ReadonlyArray<PromptbookCliInstallationStatus>): void {
    for (const status of statuses) {
        const { npmPackageName, installedVersion } = status.installation;

        if (status.installationState === 'up-to-date') {
            console.info(colors.gray(`✔ Promptbook CLI \`${npmPackageName}\` ${installedVersion} is up to date.`));
            continue;
        }

        if (status.installationState === 'unknown') {
            console.info(
                colors.gray(
                    `✔ Promptbook CLI \`${npmPackageName}\` ${installedVersion} is installed; the newest version could not be checked.`,
                ),
            );
        }
    }
}

/**
 * Prints the exact commands which would update all declined outdated installations.
 */
function reportManualPromptbookCliUpdateCommands(
    outdatedStatuses: ReadonlyArray<PromptbookCliInstallationStatus>,
): void {
    const manualInstallCommands = outdatedStatuses
        .map((status) => `- \`${buildPromptbookCliInstallCommand(status.installation)}\``)
        .join('\n');

    console.info(
        colors.gray(
            spaceTrim(
                (block) => `
                    Skipped updating Promptbook CLI.

                    Run these commands manually:

                    ${block(manualInstallCommands)}
                `,
            ),
        ),
    );
}

// Note: [🟡] Code for Promptbook CLI installation orchestration [$ensurePromptbookCliInstallations](src/cli/cli-commands/common/promptbook-cli/$ensurePromptbookCliInstallations.ts) should never be published outside of `@promptbook/cli`
