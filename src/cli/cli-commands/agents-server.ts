import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $requireCliSubcommand } from '../common/$requireCliSubcommand';
import { $initializeAgentsServerInitCommand } from './agents-server/init';
import {
    $initializeAgentsServerBuildCommand,
    $initializeAgentsServerDevCommand,
    $initializeAgentsServerStartCommand,
} from './agents-server/run';

/**
 * Initializes `agents-server` command with subcommands for Promptbook CLI utilities.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerCommand(program: Program): $side_effect {
    const agentsServerCommand = program.command('agents-server');
    agentsServerCommand.description(
        spaceTrim(`
            Local Agents Server runtime and coding-agent orchestration

            Subcommands:
            - build: Build the web server for later local startup
            - dev: Start the web server in development mode with hot reloading
            - init: Initialize local web server configuration
            - start: Start the web server and local coding-agent message runners
        `),
    );

    $initializeAgentsServerBuildCommand(agentsServerCommand);
    $initializeAgentsServerDevCommand(agentsServerCommand);
    $initializeAgentsServerInitCommand(agentsServerCommand);
    $initializeAgentsServerStartCommand(agentsServerCommand);

    $requireCliSubcommand(agentsServerCommand);
}

// Note: [🟡] Code for CLI command [agents-server](src/cli/cli-commands/agents-server.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
