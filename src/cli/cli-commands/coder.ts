import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeCoderFindFreshEmojiTagCommand } from './coder/find-fresh-emoji-tags';
import { $initializeCoderFindRefactorCandidatesCommand } from './coder/find-refactor-candidates';
import { $initializeCoderGenerateBoilerplatesCommand } from './coder/generate-boilerplates';
import { $initializeCoderInitCommand } from './coder/init';
import { $initializeCoderRunCommand } from './coder/run';
import { $initializeCoderVerifyCommand } from './coder/verify';

/**
 * Initializes `coder` command with subcommands for Promptbook CLI utilities
 *
 * The coder command provides utilities for automated coding:
 * - init: Initialize coder configuration in current project
 * - generate-boilerplates: Generate prompt boilerplate files
 * - find-refactor-candidates: Find files that need refactoring
 * - run: Run coding prompts with AI agents
 * - verify: Verify completed prompts
 * - find-fresh-emoji-tags: Find unused emoji tags
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderCommand(program: Program): $side_effect {
    const coderCommand = program.command('coder');
    coderCommand.description(
        spaceTrim(`
            Coding utilities for automated development workflows

            Subcommands:
            - init: Initialize coder configuration in current project
            - generate-boilerplates: Generate prompt boilerplate files
            - find-refactor-candidates: Find files that need refactoring
            - run: Run coding prompts with AI agents
            - verify: Verify completed prompts
            - find-fresh-emoji-tags: Find unused emoji tags
        `),
    );

    // Register all subcommands
    $initializeCoderInitCommand(coderCommand);
    $initializeCoderGenerateBoilerplatesCommand(coderCommand);
    $initializeCoderFindRefactorCandidatesCommand(coderCommand);
    $initializeCoderRunCommand(coderCommand);
    $initializeCoderVerifyCommand(coderCommand);
    $initializeCoderFindFreshEmojiTagCommand(coderCommand);

    // If no subcommand is provided, show help
    coderCommand.action(() => {
        console.info(colors.yellow('Please specify a subcommand.'));
        console.info('');
        coderCommand.help();
    });
}

// Note: [🟡] Code for CLI command [coder](src/cli/cli-commands/coder.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
