import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `boilerplate` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeBoilerplateCommand(program: Program): $side_effect {
    const boilerplateCommand = program.command('boilerplate');
    boilerplateCommand.description(
        spaceTrim(`
            @@
        `),
    );

    boilerplateCommand.action(
        handleActionErrors(async (cliOptions) => {
            // @@
            TODO_USE(cliOptions);

            console.error(colors.green(`@@`));

            return process.exit(0);
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
