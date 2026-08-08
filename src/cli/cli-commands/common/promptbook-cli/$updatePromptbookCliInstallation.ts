import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../../errors/assertsError';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';
import { buildPromptbookCliInstallCommand } from './buildPromptbookCliInstallCommand';

/**
 * Updates one Promptbook CLI package in its existing local or global location.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it installs an npm package
 *
 * @returns `true` when the package update succeeds, `false` when it fails
 * @private internal utility of `promptbookCli`
 */
export async function $updatePromptbookCliInstallation(status: PromptbookCliInstallationStatus): Promise<boolean> {
    const { npmPackageName } = status.installation;
    const installCommand = buildPromptbookCliInstallCommand(status.installation);

    console.info(colors.cyan(`Updating Promptbook CLI package \`${npmPackageName}\` with \`${installCommand}\`...`));

    try {
        await $execCommand({
            command: installCommand,
            crashOnError: true,
            isVerbose: true,
        });
    } catch (error) {
        assertsError(error);
        const updateErrorMessage = error.message;

        console.error(
            colors.red(
                spaceTrim(
                    (block) => `
                        Could not update **Promptbook CLI** package \`${npmPackageName}\`.

                        Update it manually with \`${installCommand}\` and run the command again.

                        ${block(updateErrorMessage)}
                    `,
                ),
            ),
        );

        return false;
    }

    console.info(colors.green(`Promptbook CLI package \`${npmPackageName}\` has been updated.`));
    return true;
}

// Note: [🟡] Code for Promptbook CLI installation update [$updatePromptbookCliInstallation](src/cli/cli-commands/common/promptbook-cli/$updatePromptbookCliInstallation.ts) should never be published outside of `@promptbook/cli`
