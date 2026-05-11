import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeAgentInitCommand } from './agent/init';
import { $initializeAgentRunCommand } from './agent/run';
import { $initializeAgentTickCommand } from './agent/tick';

/**
 * Initializes `agent` command with subcommands for Promptbook CLI utilities.
 *
 * The agent command provides utilities for repository-backed message queues:
 * - init: Initialize local agent queue and instruction files
 * - tick: Answer one queued message and exit
 * - run: Watch the queue and answer messages one by one
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentCommand(program: Program): $side_effect {
    const agentCommand = program.command('agent');
    agentCommand.description(
        spaceTrim(`
            Non-coding agent utilities backed by repository message files

            Subcommands:
            - init: Initialize local agent queue and instruction files
            - tick: Answer one queued message and exit
            - run: Watch the queue and answer messages one by one
        `),
    );

    $initializeAgentInitCommand(agentCommand);
    $initializeAgentTickCommand(agentCommand);
    $initializeAgentRunCommand(agentCommand);

    agentCommand.action(() => {
        console.info(colors.yellow('Please specify a subcommand.'));
        console.info('');
        agentCommand.help();
    });
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
