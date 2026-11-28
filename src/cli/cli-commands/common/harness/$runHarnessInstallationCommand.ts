import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../../errors/assertsError';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * What one harness installation command does with the harness.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessInstallationOperation = 'install' | 'update';

/**
 * Words describing each operation in the terminal output.
 */
const HARNESS_INSTALLATION_OPERATION_WORDS: Readonly<
    Record<HarnessInstallationOperation, { readonly running: string; readonly finished: string }>
> = {
    install: { running: 'Installing', finished: 'installed' },
    update: { running: 'Updating', finished: 'updated' },
};

/**
 * Options of one command which installs or updates a CLI coding harness.
 *
 * @private internal utility of `$runHarnessInstallationCommand`
 */
type HarnessInstallationCommandOptions = {
    /**
     * Harness which is installed or updated.
     */
    readonly definition: HarnessDefinition;

    /**
     * What the command does with the harness.
     */
    readonly operation: HarnessInstallationOperation;

    /**
     * Shell command which does it.
     */
    readonly command: string;

    /**
     * Extra environment variables required by the command.
     */
    readonly environment?: Readonly<Record<string, string>>;
};

/**
 * Runs one command which installs or updates a CLI coding harness.
 *
 * A failed installation is reported but never aborts the running command, because the harness check
 * is only an assistant - the command itself may still work with a manually managed harness.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it installs software
 *
 * @returns `true` when the command succeeded, `false` when it failed
 * @private internal utility of `promptbookCli`
 */
export async function $runHarnessInstallationCommand(options: HarnessInstallationCommandOptions): Promise<boolean> {
    const { definition, operation, command, environment } = options;
    const operationWords = HARNESS_INSTALLATION_OPERATION_WORDS[operation];

    console.info(colors.cyan(`${operationWords.running} ${definition.label} with \`${command}\`...`));

    try {
        await $execCommand({
            command,
            crashOnError: true,
            isVerbose: true,
            env: environment ? { ...environment } : undefined,
        });
    } catch (error) {
        assertsError(error);
        const installErrorMessage = error.message;

        console.error(
            colors.red(
                spaceTrim(
                    (block) => `
                        Could not ${operation} **${definition.label}**.

                        Run \`${command}\` manually and run the command again.

                        ${block(installErrorMessage)}
                    `,
                ),
            ),
        );

        return false;
    }

    console.info(colors.green(`${definition.label} has been ${operationWords.finished}.`));
    return true;
}

// Note: [🟡] Code for CLI harness installation commands [$runHarnessInstallationCommand](src/cli/cli-commands/common/harness/$runHarnessInstallationCommand.ts) should never be published outside of `@promptbook/cli`
