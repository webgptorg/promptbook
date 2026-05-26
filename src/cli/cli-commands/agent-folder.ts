import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeAgentInitCommand } from './agent-folder/init';
import { $initializeAgentRunMultipleCommand } from './agent-folder/runMultiple';
import { $initializeAgentRunCommand } from './agent-folder/run';
import { $initializeAgentTickCommand } from './agent-folder/tick';

/**
 * Initializes `agent-folder` command with subcommands for Promptbook CLI utilities.
 *
 * The agent-folder command provides utilities for repository-backed message queues:
 * - init: Initialize local agent queue and instruction files
 * - run-once (alias: tick): Answer one queued message and exit
 * - run-agent (alias: run): Watch one queue and answer messages one by one
 * - run-multiple: Watch direct child agent repositories in one shared session
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentFolderCommand(program: Program): $side_effect {
    const agentFolderCommand = program.command('agent-folder');
    agentFolderCommand.description(
        spaceTrim(`
            Non-coding agent utilities backed by repository message files

            Subcommands:
            - init: Initialize local agent queue and instruction files
            - run-once (alias: tick): Answer one queued message and exit
            - run-agent (alias: run): Watch one queue and answer messages one by one
            - run-multiple: Watch direct child agent repositories in one shared session
        `),
    );

    $initializeAgentInitCommand(agentFolderCommand);
    $initializeAgentTickCommand(agentFolderCommand);
    $initializeAgentRunCommand(agentFolderCommand);
    $initializeAgentRunMultipleCommand(agentFolderCommand);

    agentFolderCommand.action(() => {
        console.info(colors.yellow('Please specify a subcommand.'));
        console.info('');
        agentFolderCommand.help();
    });
}

// Note: [🟡] Code for CLI command [agent-folder](src/cli/cli-commands/agent-folder.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
