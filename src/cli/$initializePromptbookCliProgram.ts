import type { Command } from 'commander';
import { CLAIM } from '../config';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import { $initializeAboutCommand } from './cli-commands/about';
import { $initializeAgentCommand } from './cli-commands/agent';
import { $initializeAgentFolderCommand } from './cli-commands/agent-folder';
import { $initializeAgentsServerCommand } from './cli-commands/agents-server';
import { $initializeCoderCommand } from './cli-commands/coder';
import { $initializeHelloCommand } from './cli-commands/hello';
import { $initializeListModelsCommand } from './cli-commands/list-models';
import { $initializeListScrapersCommand } from './cli-commands/list-scrapers';
import { $initializeLoginCommand } from './cli-commands/login';
import { $initializeMakeCommand } from './cli-commands/make';
import { $initializePrettifyCommand } from './cli-commands/prettify';
import { $initializeRunCommand } from './cli-commands/run';
import { $initializeStartAgentsServerCommand } from './cli-commands/start-agents-server';
import { $initializeStartPipelinesServerCommand } from './cli-commands/start-pipelines-server';
import { $initializeTestCommand } from './cli-commands/test-command';
import { $addGlobalOptionsToCommand } from './common/$addGlobalOptionsToCommand';
import { $deprecateCliCommand } from './common/$deprecateCliCommand';

/**
 * Shared deprecation text for top-level CLI commands backed by the old pipeline system.
 */
const OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE = 'This command is part of the old pipeline system.';

/**
 * Shared deprecation text for top-level CLI commands backed by the old pre-agent system.
 */
const OLD_SYSTEM_DEPRECATION_MESSAGE = 'This command is part of the old system.';

/**
 * Deprecation guidance for top-level `ptbk` commands that remain for compatibility.
 */
const DEPRECATED_TOP_LEVEL_COMMAND_MESSAGES: Readonly<Record<string, string>> = {
    run: OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
    login: OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
    make: OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
    prettify: OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
    test: OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
    'list-models': OLD_SYSTEM_DEPRECATION_MESSAGE,
    'list-scrapers': OLD_SYSTEM_DEPRECATION_MESSAGE,
    'start-agents-server': 'Use `ptbk agents-server start` instead.',
    'start-pipelines-server': OLD_PIPELINE_SYSTEM_DEPRECATION_MESSAGE,
};

/**
 * Registers the CLI commands on a fresh Commander program without parsing arguments or running an action.
 * Tests can configure output and exit handling before registration, so subcommands inherit those settings.
 *
 * @private internal utility of `promptbookCli`
 */
export function $initializePromptbookCliProgram(program: Command): void {
    program.name('promptbook');
    program.alias('ptbk');
    program.version(PROMPTBOOK_ENGINE_VERSION);
    program.description(CLAIM);

    // Commands are listed in registration order. Keep `coder` first and hide deprecated commands below.
    $initializeCoderCommand(program);
    $initializeAgentCommand(program);
    $initializeAgentFolderCommand(program);
    $initializeAgentsServerCommand(program);
    $initializeAboutCommand(program);
    $initializeHelloCommand(program);
    $initializeRunCommand(program);
    $initializeLoginCommand(program);
    $initializeMakeCommand(program);
    $initializePrettifyCommand(program);
    $initializeTestCommand(program);
    $initializeListModelsCommand(program);
    $initializeListScrapersCommand(program);
    $initializeStartAgentsServerCommand(program);
    $initializeStartPipelinesServerCommand(program);

    for (const command of program.commands) {
        const deprecationMessage = DEPRECATED_TOP_LEVEL_COMMAND_MESSAGES[command.name()];

        if (deprecationMessage !== undefined) {
            $deprecateCliCommand(command, deprecationMessage);
        }
    }

    program.commands.forEach($addGlobalOptionsToCommand);
}

// Note: [🟡] Code for CLI command registration [$initializePromptbookCliProgram](src/cli/$initializePromptbookCliProgram.ts) should never be published outside of `@promptbook/cli`
