import colors from 'colors';
import { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder find-unwritten` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderFindUnwrittenCommand(program: Program): $side_effect {
    const command = program.command('find-unwritten');
    command.description('List all prompt sections that still need to be authored (contain @@@ placeholder)');
    command.option('--priority <minimum-priority>', 'Filter prompts by minimum priority level', parseIntOption, 0);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { priority = 0 } = cliOptions as {
                readonly priority?: number;
            };

            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { findUnwrittenPrompts } = await import(
                '../../../../scripts/run-codex-prompts/main/findUnwrittenPrompts'
            );

            try {
                await findUnwrittenPrompts({ priority });
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Parses an integer option value
 *
 * @private internal utility of `coder find-unwritten` command
 */
function parseIntOption(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return parsed;
}

// Note: [🟡] Code for CLI command [find-unwritten](src/cli/cli-commands/coder/find-unwritten.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
