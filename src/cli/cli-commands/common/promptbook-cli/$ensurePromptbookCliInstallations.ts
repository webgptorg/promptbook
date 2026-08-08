import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { $askForNpmPackageInstallationApproval } from '../npm/$askForNpmPackageInstallationApproval';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';
import { $checkPromptbookCliInstallations } from './$checkPromptbookCliInstallations';
import { $updatePromptbookCliInstallation } from './$updatePromptbookCliInstallation';
import { buildPromptbookCliInstallCommand } from './buildPromptbookCliInstallCommand';
import { formatPromptbookCliInstallationWarning } from './formatPromptbookCliInstallationWarning';

/**
 * Checks local and global Promptbook CLI installations before an interactive coder run and offers to update them.
 *
 * Once an update is approved, the caller must stop the current run and let the user start a fresh process. A local
 * npm update can modify `package.json` and a lockfile, which would make the coder's working-tree preflight fail;
 * more importantly, this Node.js process has already loaded the old CLI implementation.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads package manifests, queries npm,
 * asks the user, and may install npm packages
 *
 * @returns `true` when an update was approved and the current coder run should stop
 * @private internal utility of `promptbookCli`
 */
export async function $ensurePromptbookCliInstallations(): Promise<boolean> {
    if (!process.stdin.isTTY) {
        // Note: Non-interactive runs cannot approve an update and should not wait for registry checks.
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
        const manualInstallCommands = outdatedStatuses
            .map((status) => `- \`${buildPromptbookCliInstallCommand(status.installation)}\``)
            .join('\n');

        console.info(
            colors.gray(
                spaceTrim(
                    (block) => `
                        Skipped updating Promptbook CLI.

                        Run one of these commands manually:

                        ${block(manualInstallCommands)}
                    `,
                ),
            ),
        );
        return false;
    }

    for (const status of outdatedStatuses) {
        await $updatePromptbookCliInstallation(status);
    }

    console.info(colors.green('Promptbook CLI update is complete. Run the command again to use the new version.'));
    return true;
}

/**
 * Reports successful and unverifiable Promptbook CLI checks when no update is required.
 *
 * @private internal utility of `$ensurePromptbookCliInstallations`
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

// Note: [🟡] Code for Promptbook CLI installation orchestration [$ensurePromptbookCliInstallations](src/cli/cli-commands/common/promptbook-cli/$ensurePromptbookCliInstallations.ts) should never be published outside of `@promptbook/cli`
