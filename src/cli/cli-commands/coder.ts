import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $initializeCoderFindFreshEmojiTagCommand } from './coder/find-fresh-emoji-tag';
import { $initializeCoderFindRefactorCandidatesCommand } from './coder/find-refactor-candidates';
import { $initializeCoderGenerateBoilerplatesCommand } from './coder/generate-boilerplates';
import { $initializeCoderRunCommand } from './coder/run';
import { $initializeCoderVerifyCommand } from './coder/verify';

/**
 * Initializes `coder` command with subcommands for Promptbook CLI utilities
 *
 * The coder command provides utilities for automated coding:
 * - generate-boilerplates: Generate prompt boilerplate files
 * - find-refactor-candidates: Find files that need refactoring
 * - run: Run coding prompts with AI agents
 * - verify: Verify completed prompts
 * - find-fresh-emoji-tag: Find unused emoji tags
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
            - generate-boilerplates: Generate prompt boilerplate files
            - find-refactor-candidates: Find files that need refactoring
            - run: Run coding prompts with AI agents
            - verify: Verify completed prompts
            - find-fresh-emoji-tag: Find unused emoji tags
        `),
    );

    // Register all subcommands
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

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
