import colors from 'colors';
import { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { createNonNegativeIntegerOptionParser } from '../common/createNonNegativeIntegerOptionParser';
import { createPositiveIntegerOptionParser } from '../common/createPositiveIntegerOptionParser';
import { handleActionErrors } from '../common/handleActionErrors';
import type { PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { DEFAULT_WAIT_AFTER_ERROR_MS, parseOptionalWaitDuration } from './waitOptions';

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
            - Progress tracking and interactive P/S/X terminal controls
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
    command.option(
        '--priority <minimum-priority>',
        'Alias for --min-priority; filter prompts by minimum priority level',
        createNonNegativeIntegerOptionParser('--priority'),
    );
    command.option(
        '--min-priority <minimum-priority>',
        'Filter prompts by minimum priority level',
        createNonNegativeIntegerOptionParser('--min-priority'),
    );
    command.option(
        '--max-priority <maximum-priority>',
        'Filter prompts by maximum priority level',
        createNonNegativeIntegerOptionParser('--max-priority'),
    );
    command.option(
        '--limit <run-count>',
        'Stop after processing this many prompt runs',
        createPositiveIntegerOptionParser('--limit'),
    );
    command.option(
        '--wait-after-prompt <duration>',
        spaceTrim(`
            Wait this long after each prompt has been implemented, verified and committed before starting the next prompt.
            Accepts durations like 1h, 30m, 5s. Defaults to 0 (no wait).
        `),
    );
    command.option(
        '--wait-between-prompts <duration>',
        spaceTrim(`
            Pace prompts so that each next prompt starts at least this long after the previous one began.
            If the previous prompt already took longer than this, the next prompt starts immediately.
            Accepts durations like 1h, 30m, 5s. Defaults to 0 (no pacing).
        `),
    );
    command.option(
        '--wait-after-error <duration>',
        spaceTrim(`
            Wait this long before retrying a prompt after an error occurs (up to 3 retries before giving up).
            Accepts durations like 1h, 30m, 5s. Defaults to 10m.
        `),
    );
    // Note: --no-auto disables the default auto behaviour and waits for user confirmation before each prompt
    command.option(
        '--no-auto',
        'Wait for user confirmation before each prompt instead of running automatically through the queue',
    );
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
            const {
                dryRun,
                agent,
                context,
                test,
                preserveLogs,
                priority,
                minPriority: minimumPriority,
                maxPriority: maximumPriority,
                limit,
                waitAfterPrompt: waitAfterPromptValue,
                waitBetweenPrompts: waitBetweenPromptsValue,
                waitAfterError: waitAfterErrorValue,
                auto,
                autoMigrate,
                allowDestructiveAutoMigrate,
            } = cliOptions as {
                readonly dryRun: boolean;
                readonly agent?: string;
                readonly context?: string;
                readonly test?: string | string[];
                readonly preserveLogs: boolean;
                readonly priority?: number;
                readonly minPriority?: number;
                readonly maxPriority?: number;
                readonly limit?: number;
                readonly waitAfterPrompt?: string;
                readonly waitBetweenPrompts?: string;
                readonly waitAfterError?: string;
                readonly auto: boolean;
                readonly autoMigrate: boolean;
                readonly allowDestructiveAutoMigrate: boolean;
            } & PromptRunnerCliOptions;

            const testCommand = normalizeCommandOptionValue(test);
            const runnerOptions = normalizePromptRunnerCliOptions(cliOptions as PromptRunnerCliOptions, {
                isAgentRequired: !dryRun,
            });

            // [1] Parse the wait options and --no-auto:
            //   default: run automatically through the queue (no waiting between prompts)
            //   --no-auto: wait for user confirmation before each prompt (interactive mode)
            //   --wait-after-prompt: pause after a successful round before starting the next prompt
            //   --wait-between-prompts: pace from start of one prompt to start of next
            //   --wait-after-error: wait before retrying after an error (default 10m)
            const waitForUser = !auto;
            const waitAfterPrompt = parseOptionalWaitDuration(waitAfterPromptValue, 0);
            const waitBetweenPrompts = parseOptionalWaitDuration(waitBetweenPromptsValue, 0);
            const waitAfterError = parseOptionalWaitDuration(waitAfterErrorValue, DEFAULT_WAIT_AFTER_ERROR_MS);

            // Convert commander options to RunOptions format
            const runOptions = {
                dryRun,
                waitForUser,
                waitAfterPrompt,
                waitBetweenPrompts,
                waitAfterError,
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
                priority: priority ?? 0,
                minimumPriority,
                maximumPriority,
                limit,
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
