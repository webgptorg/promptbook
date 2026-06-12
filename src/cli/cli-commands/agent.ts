import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeAgentChatCommand } from './agent/chat';
import { $initializeAgentExecCommand } from './agent/exec';

/**
 * Initializes `agent` command with subcommands for Promptbook CLI utilities.
 *
 * The agent command runs one `.book` source directly through a selected CLI harness:
 * - chat: Run an interactive terminal chat session
 * - exec: Send one message and print the response
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentCommand(program: Program): $side_effect {
    const agentCommand = program.command('agent');
    agentCommand.description(
        spaceTrim(`
            Run a Promptbook agent book directly in the terminal

            Subcommands:
            - chat: Run an interactive terminal chat session
            - exec: Send one message and print the response
        `),
    );

    $initializeAgentChatCommand(agentCommand);
    $initializeAgentExecCommand(agentCommand);

    agentCommand.action(() => {
        console.info(colors.yellow('Please specify a subcommand.'));
        console.info('');
        agentCommand.help();
    });
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
