import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';

/**
 * Initializes `boilerplate` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeBoilerplateCommand(program: Program) {
    const boilerplateCommand = program.command('boilerplate');
    boilerplateCommand.description(
        spaceTrim(`
            @@@
        `),
    );

    boilerplateCommand.action(async () => {
        // @@@

          console.error(colors.green(`@@@`));


        return process.exit(0);
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
