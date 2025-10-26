import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Initializes `login` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeLoginCommand(program: Program): $side_effect {
    const loginCommand = program.command('login');
    loginCommand.description(
        spaceTrim(`
            Login to the remote Promptbook server
        `),
    );

    loginCommand.action(
        handleActionErrors(async (cliOptions) => {
            // Note: Not interested in return value of this function but the side effect of logging in
            await $provideLlmToolsForCli({
                isLoginloaded: true,

                cliOptions: {
                    ...cliOptions,
                    strategy: 'REMOTE_SERVER', // <- Note: Overriding strategy to `REMOTE_SERVER`
                    //                               TODO: Do not allow flag `--strategy` in `login` command at all
                },
            });
            return process.exit(0);
        }),
    );
}

/**
 * TODO: Implement non-interactive login
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
