import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../../errors/assertsError';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Installs or updates one CLI coding harness globally through npm.
 *
 * A failed installation is reported but never aborts the running command, because the harness check
 * is only an assistant - the command itself may still work with a manually managed harness.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it installs a global npm package
 *
 * @returns `true` when the harness has been installed, `false` when the installation failed
 * @private internal utility of `promptbookCli`
 */
export async function $installHarness(definition: HarnessDefinition): Promise<boolean> {
    const installCommand = buildHarnessInstallCommand(definition);

    console.info(colors.cyan(`Installing ${definition.label} with \`${installCommand}\`...`));

    try {
        await $execCommand({
            command: installCommand,
            crashOnError: true,
            isVerbose: true,
            env: definition.npmInstallEnvironment ? { ...definition.npmInstallEnvironment } : undefined,
        });
    } catch (error) {
        assertsError(error);
        const installErrorMessage = error.message;

        console.error(
            colors.red(
                spaceTrim(
                    (block) => `
                        Could not install **${definition.label}**.

                        Install it manually with \`${installCommand}\` and run the command again.

                        ${block(installErrorMessage)}
                    `,
                ),
            ),
        );

        return false;
    }

    console.info(colors.green(`${definition.label} has been installed.`));
    return true;
}

// Note: [🟡] Code for CLI harness installation [$installHarness](src/cli/cli-commands/common/harness/$installHarness.ts) should never be published outside of `@promptbook/cli`
