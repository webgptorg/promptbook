import {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
    Option,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { createPositiveIntegerOptionParser } from '../common/createPositiveIntegerOptionParser';
import { $assertSufficientFreeDiskSpace } from '../common/disk-space/$assertSufficientFreeDiskSpace';
import { validateCoderRunOptions } from '../common/validateCoderRunOptions';
import { rejectLegacyCoderCheckOptions } from '../common/rejectLegacyCoderCheckOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';
import { addWorkspaceRepositoryOptions } from '../common/workspaceRepositoryCliOptions';
import { normalizeProjectCliOptions } from '../common/projectCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import {
    addQuestionsOption,
    assertUserConfirmationIsAllowed,
    normalizeQuestionsCliOptions,
    QUESTIONS_DESCRIPTION,
    type QuestionsCliOptions,
} from '../common/questionsCliOptions';
import { $ensurePromptbookCliInstallations } from '../common/promptbook-cli/$ensurePromptbookCliInstallations';
import type { PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { addPromptPriorityOptions } from '../common/promptPriorityCliOptions';
import {
    CHECK_BEFORE_MODE_VALUES,
    DEFAULT_CODER_CHECK_COMMAND,
    type CheckBeforeMode,
} from '../../../../scripts/run-codex-prompts/checking/CheckBeforeMode';
import { DEFAULT_WAIT_AFTER_ERROR_MS, parseOptionalWaitDuration } from './waitOptions';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { addCoderExecutionOptions, type CoderAgentCliOptions } from './agentCliOptions';
import { printCoderRunFailure } from './printCoderRunFailure';

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
        spaceTrim(
            (block) => `
            Execute coding prompts with the project's Developer Book through the selected harness

            ${block(PROMPT_RUNNER_DESCRIPTION)}

            ${block(QUESTIONS_DESCRIPTION)}

            Features:
            - Resolves FROM, IMPORT and TEAM by agent name, book-relative path, project path or URL
            - Creates a missing .core/adam.book beside the selected agent for default inheritance
            - Automatically stages and commits changes with agent identity unless --no-commit is used
            - Commits only the prompt file and the files the coding agent has changed, leaving unrelated changes alone
            - Refuses to start on a dirty working tree unless --git-changes says what should happen with the changes
            - Optional --git-changes continue resumes the single prompt an interrupted coder left in the [^] status
            - Optional post-commit git push with explicit --auto-push opt-in
            - Optional pre-prompt git pull with explicit --auto-pull opt-in
            - Optional --isolate runs every prompt in its own temporary git worktree and merges it back when verified
            - Saves the run trace of every round into prompts/traces/, named after its prompt file
            - Optional --preserve-logs keeps temp prompt/log artifacts after successful rounds
            - Optional --no-ui keeps plain streaming console output for logging and debugging
            - The dashboard starts in Normal output; press O to toggle Raw output without restarting the task
            - Refuses to start on a nearly full disk and pauses the run when the free disk space becomes critical, unless --no-questions is used
            - Checks that the selected harness is installed and up to date before the first prompt unless --no-questions is used
            - Offers to add missing project-local ignore rules for the selected harness
            - In interactive mode, checks local and global Promptbook CLI installations and offers to update them
            - Supports GPG signing of commits
            - Optional pre-coding project check that can stop or repair pre-existing failures
            - Optional post-prompt check with check-feedback retries
            - Progress tracking and interactive P/S/X terminal controls; O changes only the dashboard output view
            - Dry-run mode to preview prompts
        `,
        ),
    );

    command.option('--dry-run', 'Print unwritten prompts without executing', false);
    addPromptRunnerSelectionOptions(command);
    addQuestionsOption(command);
    addCoderExecutionOptions(command);
    command.option(
        '--check <check-command...>',
        'Run the aggregate project check after each prompt; quote it when the command itself contains top-level flags',
    );
    command.addOption(
        new Option(
            '--check-before <mode>',
            `Run the project check before coding: ${CHECK_BEFORE_MODE_VALUES.join(
                ', ',
            )} (defaults to no; uses npm run check when --check is omitted)`,
        )
            .choices([...CHECK_BEFORE_MODE_VALUES])
            .default('no'),
    );
    // Keep the removed spellings parseable long enough to report an actionable migration error.
    command.addOption(new Option('--test [test-command...]').hideHelp());
    command.addOption(new Option('--test-before [mode]').hideHelp());
    command.option(
        '--preserve-logs',
        'Keep generated temp prompt/log artifacts after successful rounds for debugging and analytics',
        false,
    );
    addPromptRunnerExecutionOptions(command);
    command.option(
        '--isolate',
        spaceTrim(`
            Implement each prompt in its own temporary git worktree with its own isolated environment.
            A verified task is merged back into the branch the coder runs on and the worktree is deleted.
            A task that cannot be merged is marked as failed and its worktree is kept for a manual merge.
        `),
        false,
    );
    addPromptPriorityOptions(command);
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

    addWorkspaceRepositoryOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const projectOptions = normalizeProjectCliOptions(cliOptions);
            const {
                dryRun,
                agent,
                context,
                check,
                checkBefore,
                test: legacyTest,
                testBefore: legacyTestBefore,
                preserveLogs,
                isolate: isIsolated,
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
                readonly check?: string | string[];
                readonly checkBefore: CheckBeforeMode;
                readonly test?: string | string[];
                readonly testBefore?: string;
                readonly preserveLogs: boolean;
                readonly isolate: boolean;
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
            } & PromptRunnerCliOptions &
                CoderAgentCliOptions;

            rejectLegacyCoderCheckOptions({ legacyTest, legacyTestBefore });

            const configuredCheckCommand = normalizeCommandOptionValue(check);
            if (check !== undefined && configuredCheckCommand === undefined) {
                throw new NotAllowed('The `--check` option requires a non-empty project check command.');
            }
            const checkCommand =
                configuredCheckCommand ?? (checkBefore === 'no' ? undefined : DEFAULT_CODER_CHECK_COMMAND);
            const runnerOptions = normalizePromptRunnerCliOptions(cliOptions as PromptRunnerCliOptions, {
                isAgentRequired: !dryRun,
            });
            const questionsOptions = normalizeQuestionsCliOptions(cliOptions as QuestionsCliOptions);

            // [1] Parse the wait options and --no-auto:
            //   default: run automatically through the queue (no waiting between prompts)
            //   --no-auto: wait for user confirmation before each prompt (interactive mode)
            //   --wait-after-prompt: pause after a successful round before starting the next prompt
            //   --wait-between-prompts: pace from start of one prompt to start of next
            //   --wait-after-error: wait before retrying after an error (default 10m)
            const waitForUser = !auto;

            assertUserConfirmationIsAllowed({ ...questionsOptions, isWaitingForUser: waitForUser });

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
                gitChanges: runnerOptions.gitChanges,
                agentName: runnerOptions.agentName,
                model: runnerOptions.model,
                agent,
                context,
                checkCommand,
                checkBefore,
                preserveLogs,
                isIsolated,
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
                isAskingQuestionsEnabled: questionsOptions.isAskingQuestionsEnabled,
            };

            validateCoderRunOptions(runOptions);
            const workspace = await $preflightWorkspaceRepository({
                ...projectOptions,
                policy: dryRun ? 'read-only' : 'mutate',
                ...questionsOptions,
            });

            const { resolveCoderProjectContext } = await import(
                '../../../../scripts/run-codex-prompts/common/resolveCoderProjectContext'
            );
            const projectContext = await resolveCoderProjectContext({
                projectPath: workspace.projectPath,
                agent,
                context,
            });

            if (!dryRun) {
                // Check disk space before installations and repository writes; previews require no setup.
                await $assertSufficientFreeDiskSpace(workspace.projectPath);

                if (await $ensurePromptbookCliInstallations(questionsOptions, workspace.projectPath)) {
                    return process.exit(0);
                }

                await $ensureHarnessInstallations([runnerOptions.agentName], questionsOptions);
                await $ensureCoderHarnessGitignoreRules(
                    workspace.projectPath,
                    runnerOptions.agentName,
                    questionsOptions,
                );
            }

            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { runCodexPrompts } = await import('../../../../scripts/run-codex-prompts/main/runCodexPrompts');

            try {
                await runCodexPrompts({ ...runOptions, workspace, projectContext });
            } catch (error) {
                assertsError(error);
                printCoderRunFailure(error);
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
