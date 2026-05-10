import colors from 'colors';
import {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
    Option,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { THINKING_LEVEL_VALUES, type ThinkingLevel } from './ThinkingLevel';

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

            Runners:
            - openai-codex: OpenAI Codex integration (requires --model)
            - github-copilot: GitHub Copilot CLI integration
            - cline: Cline CLI integration
            - claude-code: Claude Code integration
            - opencode: Opencode integration
            - gemini: Google Gemini CLI integration (requires --model)

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
    command.option(
        '--agent <agent-name>',
        'Select runner: openai-codex, github-copilot, cline, claude-code, opencode, gemini (required for non-dry-run)',
    );
    command.option(
        '--model <model>',
        spaceTrim(`
            Model to use (required for openai-codex and gemini)

            OpenAI examples: gpt-5.2-codex, default
            Gemini examples: gemini-3-flash-preview, default
        `),
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
    command.option(
        '--no-ui',
        'Disable the rich terminal UI and keep plain streaming console output for logging and debugging',
    );
    command.addOption(
        new Option(
            '--thinking-level <thinking-level>',
            `Set reasoning effort for supported runners (${THINKING_LEVEL_VALUES.join(', ')})`,
        ).choices([...THINKING_LEVEL_VALUES]),
    );
    command.option('--priority <minimum-priority>', 'Filter prompts by minimum priority level', parseIntOption, 0);
    command.option('--no-wait', 'Skip user prompts between processing');
    command.option('--no-commit', 'Leave successful changes in the working directory instead of creating git commits');
    command.option('--ignore-git-changes', 'Skip clean working tree check before running prompts', false);
    command.option(
        '--allow-credits',
        'Allow OpenAI Codex runner to spend credits when rate limits are exhausted',
        false,
    );
    command.option(
        '--no-normalize-line-endings',
        'Disable automatic LF normalization for files changed in each coding round',
    );
    command.option('--auto-push', 'Automatically git push after each commit', false);
    command.option('--auto-pull', 'Automatically git pull before the first and each subsequent prompt', false);
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
                model,
                context,
                test,
                preserveLogs,
                ui,
                thinkingLevel,
                priority,
                wait,
                commit,
                ignoreGitChanges,
                allowCredits,
                normalizeLineEndings,
                autoMigrate,
                allowDestructiveAutoMigrate,
                autoPush,
                autoPull,
            } = cliOptions as {
                readonly dryRun: boolean;
                readonly agent?: string;
                readonly model?: string;
                readonly context?: string;
                readonly test?: string | string[];
                readonly preserveLogs: boolean;
                readonly ui: boolean;
                readonly thinkingLevel?: ThinkingLevel;
                readonly priority: number;
                readonly wait: boolean;
                readonly commit: boolean;
                readonly ignoreGitChanges: boolean;
                readonly allowCredits: boolean;
                readonly normalizeLineEndings: boolean;
                readonly autoMigrate: boolean;
                readonly allowDestructiveAutoMigrate: boolean;
                readonly autoPush: boolean;
                readonly autoPull: boolean;
            };

            const testCommand = normalizeCommandOptionValue(test);
            const noUi = !ui;

            // Validate agent
            let agentName:
                | 'openai-codex'
                | 'github-copilot'
                | 'cline'
                | 'claude-code'
                | 'opencode'
                | 'gemini'
                | undefined = undefined;

            if (agent) {
                if (
                    agent === 'openai-codex' ||
                    agent === 'github-copilot' ||
                    agent === 'cline' ||
                    agent === 'claude-code' ||
                    agent === 'opencode' ||
                    agent === 'gemini'
                ) {
                    agentName = agent;
                } else {
                    console.error(
                        colors.red(
                            `Invalid agent "${agent}". Must be one of: openai-codex, github-copilot, cline, claude-code, opencode, gemini`,
                        ),
                    );
                    return process.exit(1);
                }
            }

            if (!agentName && !dryRun) {
                console.error(
                    colors.red(
                        'You must choose an agent using --agent <openai-codex|github-copilot|cline|claude-code|opencode|gemini>',
                    ),
                );
                return process.exit(1);
            }

            // Convert commander options to RunOptions format
            const runOptions = {
                dryRun,
                waitForUser: wait,
                noCommit: !commit,
                ignoreGitChanges,
                agentName,
                model,
                context,
                testCommand,
                preserveLogs,
                noUi,
                thinkingLevel,
                priority,
                normalizeLineEndings,
                allowCredits,
                autoMigrate,
                allowDestructiveAutoMigrate,
                autoPush,
                autoPull,
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
