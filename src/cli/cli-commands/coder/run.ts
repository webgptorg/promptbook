import colors from 'colors';
import { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import type { PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { parseDuration } from '../../../../scripts/run-codex-prompts/common/parseDuration';

/**
 * Initializes `coder run` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderRunCommand(program: Program): $side_effect {
    const command = program.command('run');
    command.description(
        spaceTrim(`
            Execute coding prompts through selected AI agent

            ${PROMPT_RUNNER_DESCRIPTION}

            Features:
            - Automatically stages and commits changes with agent identity unless --no-commit is used
            - Optional post-commit git push with explicit --auto-push opt-in
            - Optional pre-prompt git pull with explicit --auto-pull opt-in
            - Optional --preserve-logs keeps temp prompt/log artifacts after successful rounds
            - Optional --no-ui keeps plain streaming console output for logging and debugging
            - Supports GPG signing of commits
            - Optional post-prompt verification with test-feedback retries
            - Progress tracking and interactive controls
            - Dry-run mode to preview prompts
        `),
    );

    command.option('--dry-run', 'Print unwritten prompts without executing', false);
    addPromptRunnerSelectionOptions(command);
    command.option(
        '--agent <agent-book-path>',
        'Path to a .book file whose compiled system message is prepended to each coding prompt',
    );
    command.option(
        '--context <context-or-file>',
        'Append extra instructions either inline or from a file path relative to the current project',
    );
    command.option(
        '--test <test-command...>',
        'Run a verification command after each prompt; quote it when the command itself contains top-level flags',
    );
    command.option(
        '--preserve-logs',
        'Keep generated temp prompt/log artifacts after successful rounds for debugging and analytics',
        false,
    );
    addPromptRunnerExecutionOptions(command);
    command.option('--priority <minimum-priority>', 'Filter prompts by minimum priority level', parseIntOption, 0);
    command.option(
        '--wait [duration]',
        spaceTrim(`
            Wait between prompt rounds.
            Without a value (default): waits for user confirmation before each prompt (interactive mode).
            With a duration like 1h, 30m, 5s: waits that long between prompts to avoid hitting rate limits of the harness.
        `),
        true,
    );
    // Note: --no-wait disables the default interactive wait-for-user behaviour
    command.option('--no-wait', 'Skip all waiting between prompts and run non-interactively');
    command.option(
        '--auto-migrate',
        'Run testing-server database migrations automatically after each successfully processed prompt',
    );
    command.option(
        '--allow-destructive-auto-migrate',
        'Allow auto-migrate even when heuristic SQL safety check flags destructive pending migrations',
    );

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { dryRun, agent, context, test, preserveLogs, priority, wait, autoMigrate, allowDestructiveAutoMigrate } =
                cliOptions as {
                    readonly dryRun: boolean;
                    readonly agent?: string;
                    readonly context?: string;
                    readonly test?: string | string[];
                    readonly preserveLogs: boolean;
                    readonly priority: number;
                    readonly wait: boolean | string;
                    readonly autoMigrate: boolean;
                    readonly allowDestructiveAutoMigrate: boolean;
                } & PromptRunnerCliOptions;

            const testCommand = normalizeCommandOptionValue(test);
            const runnerOptions = normalizePromptRunnerCliOptions(cliOptions as PromptRunnerCliOptions, {
                isAgentRequired: !dryRun,
            });

            // [1] Parse the --wait option:
            //   true (default or --wait without value): wait for user confirmation
            //   false (--no-wait): no waiting at all
            //   string (--wait 1h): wait that long between prompt rounds
            let waitForUser = false;
            let waitBetweenPrompts = 0;

            if (wait === true) {
                waitForUser = true;
            } else if (typeof wait === 'string' && wait !== '') {
                waitBetweenPrompts = parseDuration(wait);
            }

            // Convert commander options to RunOptions format
            const runOptions = {
                dryRun,
                waitForUser,
                waitBetweenPrompts,
                noCommit: runnerOptions.noCommit,
                ignoreGitChanges: runnerOptions.ignoreGitChanges,
                agentName: runnerOptions.agentName,
                model: runnerOptions.model,
                agent,
                context,
                testCommand,
                preserveLogs,
                noUi: runnerOptions.noUi,
                thinkingLevel: runnerOptions.thinkingLevel,
                priority,
                normalizeLineEndings: runnerOptions.normalizeLineEndings,
                allowCredits: runnerOptions.allowCredits,
                autoMigrate,
                allowDestructiveAutoMigrate,
                autoPush: runnerOptions.autoPush,
                autoPull: runnerOptions.autoPull,
            };

            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { runCodexPrompts } = await import('../../../../scripts/run-codex-prompts/main/runCodexPrompts');

            try {
                // Override process.argv to pass options to the legacy parseRunOptions if needed
                await runCodexPrompts(runOptions);
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Parses an integer option value
 *
 * @private internal utility of `coder run` command
 */
function parseIntOption(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return parsed;
}

/**
 * Joins one Commander option that may be parsed either as a single string or a variadic token array.
 *
 * @private internal utility of `coder run` command
 */
function normalizeCommandOptionValue(value: string | string[] | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    const parts = Array.isArray(value) ? value : [value];
    const normalizedValue = parts
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ')
        .trim();
    return normalizedValue === '' ? undefined : normalizedValue;
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/coder/run.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
