import { Command, Option } from 'commander';
import { spaceTrim } from 'spacetrim';
import { NETWORK_LIMITS } from '../../constants';
import { NotAllowed } from '../../errors/NotAllowed';
import type { number_port } from '../../types/number_positive';
import { DEFAULT_WAIT_AFTER_ERROR_MS, parseOptionalWaitDuration } from './coder/waitOptions';
import { handleActionErrors } from './common/handleActionErrors';
import { addPromptPriorityOptions } from './common/promptPriorityCliOptions';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerCliOptions,
} from './common/promptRunnerCliOptions';
import { normalizeQuestionsCliOptions } from './common/questionsCliOptions';
import { $preflightWorkspaceRepository } from './common/workspaceRepository';
import { addWorkspaceRepositoryOptions } from './common/workspaceRepositoryCliOptions';
import { normalizePriorityFilter } from '../../../scripts/run-codex-prompts/prompts/priorityFilter';
import { validateCoderRunOptions } from './common/validateCoderRunOptions';

/**
 * Both spellings retain the historical coder server port. Standalone agents-server still uses 4440.
 * @private shared workspace server default
 */
export const DEFAULT_WORKSPACE_SERVER_PORT = '4441';

/**
 * Registers the canonical workspace command or its coder alias with identical options and action.
 * @private internal registration helper for `ptbk server` and `ptbk coder server`
 */
export function $initializeServerCommand(program: Command): void {
    const command = program.command('server');
    command.description(
        spaceTrim(`
        Start the complete Agent Server over this Git workspace and implement ready PRDs autonomously.
        Books in agents/ are authoritative; application data persists in .promptbook SQLite databases.
        All priorities are considered, highest first, with fair progress among eligible agents at each priority.
        Work without an explicit target uses Developer; Planner and TEAM helpers run only when explicitly targeted or consulted.
        No mandatory agent or harness flag. Explicit configuration is authoritative; unavailable jobs are blocked.
        Local URL: http://localhost:${DEFAULT_WORKSPACE_SERVER_PORT}; authenticated web app binds to loopback.
        Defaults: automatic processing, scoped local commits, safe pull/push when a remote/upstream is configured.
        --no-auto starts paused; pause stops new claims and lets the current job finish.
        P pauses/resumes, S skips pacing, X stops after the current job. --no-ui keeps plain output and the web app.
        --dry-run prints discovery/readiness and never bootstraps files, opens SQLite or starts a service.
        PTBK_SERVER_PORT takes precedence over legacy PTBK_CODER_SERVER_PORT, then PORT.
    `),
    );
    command.addOption(
        new Option('--port <port>', 'Listening port shared by both spellings')
            .env('PTBK_SERVER_PORT')
            .default(DEFAULT_WORKSPACE_SERVER_PORT),
    );
    command.option('--workspace <directory>', 'Selected project directory (defaults to the current directory)');
    command.option('--dry-run', 'Preview project agents and ready PRDs without setup or execution', false);
    command.option('--force-build', 'Rebuild the bundled Agent Server before startup', false);
    addPromptRunnerSelectionOptions(command);
    command.option(
        '--agent <book>',
        'Optional queue filter by Book path or title; all discovered agents remain available for chat',
    );
    command.option('--context <context-or-file>', 'Additional instructions or a project-relative file');
    command.option('--test <test-command...>', 'Verification command after each implementation');
    command.option('--preserve-logs', 'Keep successful round artifacts', false);
    addPromptRunnerExecutionOptions(command, { gitChanges: 'ignore', autoPull: true, autoPush: true });
    command.option('--no-auto-pull', 'Disable automatic remote pull');
    command.option('--no-auto-push', 'Disable automatic remote push');
    command.option('--no-auto', 'Start paused; resume through the authenticated web UI or terminal');
    command.option('--auto-migrate', 'Apply the shared testing-server migration checks after successful work');
    command.option('--allow-destructive-auto-migrate', 'Allow the shared migration safety override');
    addPromptPriorityOptions(command);
    command.option('--wait-after-prompt <duration>', 'Pacing delay after a completed job (default 0)');
    command.option('--wait-between-prompts <duration>', 'Minimum interval between job starts (default 0)');
    command.option('--wait-after-error <duration>', 'Shared error retry delay (default 10m)');
    addWorkspaceRepositoryOptions(command);
    command.action(
        handleActionErrors(
            async (provided, parsedCommand: Command) => {
                const options = provided;
                const source = parsedCommand.getOptionValueSource('port');
                const rawPort =
                    source === 'default'
                        ? process.env.PTBK_CODER_SERVER_PORT || process.env.PORT || options.port
                        : options.port;
                const port = Number(rawPort);
                if (
                    !/^\d+$/u.test(String(rawPort)) ||
                    !Number.isInteger(port) ||
                    port < 1 ||
                    port > NETWORK_LIMITS.MAX_PORT
                ) {
                    throw new NotAllowed(
                        spaceTrim(
                            `Invalid server port \`${rawPort}\`. Use --port with an integer from 1 to ${NETWORK_LIMITS.MAX_PORT}.`,
                        ),
                    );
                }
                const runner = normalizePromptRunnerCliOptions(options, { isAgentRequired: false });
                const questions = normalizeQuestionsCliOptions(options);
                const runOptions = {
                    ...runner,
                    dryRun: options.dryRun,
                    preserveLogs: options.preserveLogs,
                    waitForUser: false,
                    gitChanges: runner.gitChanges,
                    waitAfterPrompt: parseOptionalWaitDuration(options.waitAfterPrompt, 0),
                    waitBetweenPrompts: parseOptionalWaitDuration(options.waitBetweenPrompts, 0),
                    waitAfterError: parseOptionalWaitDuration(options.waitAfterError, DEFAULT_WAIT_AFTER_ERROR_MS),
                    priority: options.priority ?? 0,
                    minimumPriority: options.minPriority,
                    maximumPriority: options.maxPriority,
                    context: options.context,
                    testCommand: Array.isArray(options.test) ? options.test.join(' ') : options.test,
                    autoMigrate: options.autoMigrate ?? false,
                    allowDestructiveAutoMigrate: options.allowDestructiveAutoMigrate ?? false,
                    isAskingQuestionsEnabled: questions.isAskingQuestionsEnabled,
                };
                const priorityFilter = normalizePriorityFilter({
                    priority: options.priority,
                    minimumPriority: options.minPriority,
                    maximumPriority: options.maxPriority,
                });
                validateCoderRunOptions(runOptions);
                const workspace = await $preflightWorkspaceRepository({
                    projectDirectory: options.workspace,
                    policy: options.dryRun ? 'read-only' : 'mutate',
                    ...questions,
                });
                const { startWorkspaceServer } = await import(
                    '../../../scripts/run-codex-prompts/workspace/startWorkspaceServer'
                );
                await startWorkspaceServer({
                    ...runOptions,
                    workspace,
                    port: port as number_port,
                    agentFilter: options.agent,
                    isPaused: options.auto === false,
                    isBuildForced: options.forceBuild,
                    priorityFilter,
                });
            },
            { isExitingOnSuccess: false },
        ),
    );
}

// Note: [🟡] Workspace server command is only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
