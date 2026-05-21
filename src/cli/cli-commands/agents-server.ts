import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeAgentsServerStartCommand } from './agents-server/run';

/**
 * Initializes `agents-server` command with self-hosted runtime subcommands.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerCommand(program: Program): $side_effect {
    const agentsServerCommand = program.command('agents-server');
    agentsServerCommand.description(
        spaceTrim(`
            Self-hosted Promptbook Agents Server utilities

            Subcommands:
            - start: Start the web app and local coding-agent message runners
        `),
    );

    $initializeAgentsServerStartCommand(agentsServerCommand);

    agentsServerCommand.action(() => {
        console.info(colors.yellow('Please specify a subcommand.'));
        console.info('');
        agentsServerCommand.help();
    });
}

// Note: [🟡] Code for CLI command [agents-server](src/cli/cli-commands/agents-server.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
