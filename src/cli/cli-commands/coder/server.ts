import colors from 'colors';
import { Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */ } from 'commander';
import { Option } from 'commander';
import { spaceTrim } from 'spacetrim';
import { NETWORK_LIMITS } from '../../../constants';
import { assertsError } from '../../../errors/assertsError';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { number_port } from '../../../types/number_positive';
import type { $side_effect } from '../../../utils/organization/$side_effect';
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
 * Default port used by `ptbk coder server`.
 *
 * @private internal constant of `ptbk coder server`
 */
const DEFAULT_CODER_SERVER_PORT = '4441';

/**
 * Initializes `coder server` command for Promptbook CLI utilities.
 *
 * Runs the same prompt processing logic as `ptbk coder run` but keeps the process alive
 * and serves a kanban web UI on the configured port.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderServerCommand(program: Program): $side_effect {
    const command = program.command('server');
    command.description(
        spaceTrim(`
            Start a coder server that watches for prompts and serves a kanban web UI

            ${PROMPT_RUNNER_DESCRIPTION}

            Features:
            - Runs the same prompt processing as \`ptbk coder run\`
            - Does not exit when all prompts are done; polls for new prompt files instead
            - Serves a kanban board at http://localhost:<port> for visual progress tracking
            - Allows editing prompt files directly from the browser (Trello-style)
            - Play / pause button in the browser stays in sync with the CLI pause state
            - Press "p" in the terminal to pause / resume (same as \`ptbk coder run\`)
        `),
    );

    command.addOption(
        new Option('--port <port>', 'Port to start the coder server on')
            .env('PTBK_CODER_SERVER_PORT')
            .default(DEFAULT_CODER_SERVER_PORT),
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
                port: rawPort,
                dryRun,
                agent,
                context,
                test,
                preserveLogs,
                priority,
                waitAfterPrompt: waitAfterPromptValue,
                waitBetweenPrompts: waitBetweenPromptsValue,
                waitAfterError: waitAfterErrorValue,
                auto,
                autoMigrate,
                allowDestructiveAutoMigrate,
            } = cliOptions as {
                readonly port: string;
                readonly dryRun: boolean;
                readonly agent?: string;
                readonly context?: string;
                readonly test?: string | string[];
                readonly preserveLogs: boolean;
                readonly priority: number;
                readonly waitAfterPrompt?: string;
                readonly waitBetweenPrompts?: string;
                readonly waitAfterError?: string;
                readonly auto: boolean;
                readonly autoMigrate: boolean;
                readonly allowDestructiveAutoMigrate: boolean;
            } & PromptRunnerCliOptions;

            const port = parseCoderServerPort(rawPort);
            const testCommand = normalizeCommandOptionValue(test);
            const runnerOptions = normalizePromptRunnerCliOptions(cliOptions as PromptRunnerCliOptions, {
                isAgentRequired: !dryRun,
            });

            // [1] Parse the wait options and --no-auto (same logic as `coder run`)
            const waitForUser = !auto;
            const waitAfterPrompt = parseOptionalWaitDuration(waitAfterPromptValue, 0);
            const waitBetweenPrompts = parseOptionalWaitDuration(waitBetweenPromptsValue, 0);
            const waitAfterError = parseOptionalWaitDuration(waitAfterErrorValue, DEFAULT_WAIT_AFTER_ERROR_MS);

            const runOptions = {
                port,
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
                priority,
                normalizeLineEndings: runnerOptions.normalizeLineEndings,
                allowCredits: runnerOptions.allowCredits,
                autoMigrate,
                allowDestructiveAutoMigrate,
                autoPush: runnerOptions.autoPush,
                autoPull: runnerOptions.autoPull,
            };

            // Note: Import dynamically to avoid loading heavy dependencies until needed
            const { runCodexPromptsServer } = await import(
                '../../../../scripts/run-codex-prompts/main/runCodexPromptsServer'
            );

            try {
                await runCodexPromptsServer(runOptions);
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
 * Parses and validates the coder server port number.
 *
 * @private internal utility of `coder server` command
 */
function parseCoderServerPort(rawPort: string): number_port {
    const port = Number.parseInt(rawPort, 10);

    if (!Number.isInteger(port) || port <= 0 || port > NETWORK_LIMITS.MAX_PORT) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid coder server port: \`${rawPort}\`.

                Use \`--port\` or \`PTBK_CODER_SERVER_PORT\` with an integer between \`1\` and \`${NETWORK_LIMITS.MAX_PORT}\`.
            `),
        );
    }

    return port as number_port;
}

/**
 * Parses an integer option value.
 *
 * @private internal utility of `coder server` command
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
 * @private internal utility of `coder server` command
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

// Note: [🟡] Code for CLI command [server](src/cli/cli-commands/coder/server.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
