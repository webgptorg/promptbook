import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder verify` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderVerifyCommand(program: Program): $side_effect {
    const command = program.command('verify');
    command.description(
        spaceTrim(`
            Interactive verification helper for completed prompts

            Features:
            - Displays list of prompt files with status counts
            - Guides through verification of completed prompts marked [x]
            - Archives verified prompt files to prompts/done/ directory
            - Auto-appends repair prompts for incomplete work
            - Processes files with all-done prompts first
        `),
    );

    command.option('--reverse', 'Process prompt files in reverse order', false);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { reverse } = cliOptions as {
                readonly reverse: boolean;
            };

            // Note: Import the main function dynamically to avoid loading heavy dependencies until needed
            const { verifyPrompts } = await import('../../../../scripts/verify-prompts/verify-prompts');

            try {
                await verifyPrompts(reverse);
            } catch (error) {
                console.error(colors.bgRed('Prompt verification failed:'), error);
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
