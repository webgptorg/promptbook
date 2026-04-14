import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import { appendCoderContext } from '../common/appendCoderContext';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../common/normalizeLineEndingsInChangedFiles';
import { printCommitMessage } from '../common/printCommitMessage';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { printAgentGitIdentityTipIfNeeded } from '../git/agentGitIdentity';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { listUpcomingTasks } from '../prompts/listUpcomingTasks';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { markPromptDone } from '../prompts/markPromptDone';
import { markPromptFailed } from '../prompts/markPromptFailed';
import { printPromptsToBeWritten } from '../prompts/printPromptsToBeWritten';
import { printStats } from '../prompts/printStats';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { summarizePrompts } from '../prompts/summarizePrompts';
import { waitForPromptStart } from '../prompts/waitForPromptStart';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { writePromptFile } from '../prompts/writePromptFile';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { DEFAULT_GEMINI_MODEL, GeminiRunner } from '../runners/gemini/GeminiRunner';
import { GitHubCopilotRunner } from '../runners/github-copilot/GitHubCopilotRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithTestFeedback } from '../testing/runPromptWithTestFeedback';
import { createCoderRunSession } from '../ui/createCoderRunSession';
import { coderRunError, coderRunInfo, coderRunWarn, setCurrentCoderRunSession } from '../ui/CoderRunSessionContext';

/**
 * Constant for prompts dir.
 */
const PROMPTS_DIR = join(process.cwd(), 'prompts');
/**
 * Constant for default codex model.
 */
const DEFAULT_CODEX_MODEL = 'gpt-5.2-codex';
/**
 * Constant for cline model.
 */
const CLINE_MODEL = 'gemini:gemini-3-flash-preview';

/**
 * Type describing runner agent name.
 */
type RunnerAgentName = NonNullable<RunOptions['agentName']>;

/**
 * Map of runner labels.
 */
const RUNNER_LABELS: Record<RunnerAgentName, string> = {
    'openai-codex': 'OpenAI Codex',
    'github-copilot': 'GitHub Copilot',
    cline: 'Cline',
    'claude-code': 'Claude Code',
    opencode: 'Opencode',
    gemini: 'Gemini CLI',
};

/**
 * Runner metadata used in prompt status lines.
 */
type RunnerMetadata = {
    runnerName: string;
    modelName?: string;
};

/**
 * Branded usage error used for early validation failures inside `ptbk coder run`.
 */
export class CoderRunUsageError extends Error {
    public readonly name = 'CoderRunUsageError';

    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CoderRunUsageError.prototype);
    }
}

/**
 * Resolves runner metadata for prompt status lines.
 */
function getRunnerMetadata(options: RunOptions, actualModel?: string): RunnerMetadata {
    const runnerName = options.agentName ? RUNNER_LABELS[options.agentName] ?? 'unknown' : 'unknown';
    let modelName: string | undefined;

    if (options.agentName === 'openai-codex') {
        modelName = actualModel;
    } else if (options.agentName === 'github-copilot') {
        modelName = actualModel;
    } else if (options.agentName === 'gemini') {
        modelName = actualModel;
    } else if (options.agentName === 'cline') {
        modelName = CLINE_MODEL;
    } else if (options.agentName === 'opencode') {
        modelName = options.model;
    }

    return { runnerName, modelName };
}

/**
 * Main entry point for running prompts with the selected agent.
 *
 * @param providedOptions - Optional pre-parsed options. If not provided, will parse from process.argv
 *
 * @public exported from `@promptbook/cli`
 */
export async function runCodexPrompts(providedOptions?: RunOptions): Promise<void> {
    const options = providedOptions ?? parseRunOptions(process.argv.slice(2));

    if (options.allowDestructiveAutoMigrate && !options.autoMigrate) {
        throw new DatabaseError(
            spaceTrim(`
                Flag \`--allow-destructive-auto-migrate\` requires \`--auto-migrate\`.
            `),
        );
    }

    const runStartDate = moment();
    const coderRunSession = options.dryRun
        ? undefined
        : createCoderRunSession({
              startTime: runStartDate,
              runOptions: options,
          });
    setCurrentCoderRunSession(coderRunSession);
    const waitForUserConfirmation = async (prompt: string): Promise<void> => {
        if (coderRunSession) {
            await coderRunSession.waitForEnter(prompt);
        }
    };

    try {
        const resolvedCoderContext = await resolveCoderContext(options.context, process.cwd());

        if (options.dryRun) {
            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            printStats(stats, options.priority);
            coderRunInfo(colors.yellow('Following prompts need to be written:'));
            printPromptsToBeWritten(promptFiles, options.priority);
            return;
        }

        let runner: PromptRunner;
        let actualRunnerModel: string | undefined;
        const agentName = options.agentName;

        if (!agentName) {
            throw new Error('Missing --agent in non-dry run mode');
        }

        if (agentName === 'openai-codex') {
            let modelToUse: string;
            if (!options.model) {
                coderRunError(colors.red('Error: --model is required when using --agent openai-codex'));
                coderRunError('');
                coderRunInfo(colors.cyan('Available models:'));
                const codexModels = OPENAI_MODELS.filter((m) => m.modelVariant === 'CHAT').map((m) => m.modelName);
                codexModels.forEach((model) => {
                    coderRunInfo(colors.gray(`  - ${model}`));
                });
                coderRunError('');
                coderRunInfo(colors.cyan('Example usage:'));
                coderRunInfo(colors.gray(`  --agent openai-codex --model gpt-5.2-codex`));
                coderRunInfo(colors.gray(`  --agent openai-codex --model default`));
                throw new CoderRunUsageError('Missing required `--model` for `--agent openai-codex`.');
            } else if (options.model === 'default') {
                modelToUse = DEFAULT_CODEX_MODEL;
            } else {
                modelToUse = options.model;
            }

            actualRunnerModel = modelToUse;
            runner = new OpenAiCodexRunner({
                codexCommand: 'codex',
                model: modelToUse,
                thinkingLevel: options.thinkingLevel,
                sandbox: 'danger-full-access',
                askForApproval: 'never',
                allowCredits: options.allowCredits,
            });

            if (!options.allowCredits) {
                coderRunInfo(
                    colors.gray(
                        'OpenAI Codex credit spending is disabled. Use `--allow-credits` to explicitly opt in.',
                    ),
                );
            }
        } else if (agentName === 'cline') {
            runner = new ClineRunner({
                model: CLINE_MODEL,
            });
        } else if (agentName === 'github-copilot') {
            const modelToUse = options.model === 'default' ? undefined : options.model;

            actualRunnerModel = modelToUse;
            runner = new GitHubCopilotRunner({
                model: modelToUse,
                thinkingLevel: options.thinkingLevel,
                streamOutput: Boolean(options.isTerminalUiEnabled && process.stdout.isTTY),
            });
        } else if (agentName === 'claude-code') {
            runner = new ClaudeCodeRunner({
                streamOutput: Boolean(options.isTerminalUiEnabled && process.stdout.isTTY),
            });
        } else if (agentName === 'opencode') {
            runner = new OpencodeRunner({
                model: options.model,
            });
        } else if (agentName === 'gemini') {
            let modelToUse: string;
            if (!options.model) {
                coderRunError(colors.red('Error: --model is required when using --agent gemini'));
                coderRunError('');
                coderRunInfo(colors.cyan('Example usage:'));
                coderRunInfo(colors.gray(`  --agent gemini --model ${DEFAULT_GEMINI_MODEL}`));
                coderRunInfo(colors.gray('  --agent gemini --model default'));
                throw new CoderRunUsageError('Missing required `--model` for `--agent gemini`.');
            } else if (options.model === 'default') {
                modelToUse = DEFAULT_GEMINI_MODEL;
            } else {
                modelToUse = options.model;
            }

            actualRunnerModel = modelToUse;
            runner = new GeminiRunner({
                model: modelToUse,
            });
        } else {
            throw new Error(`Unknown agent: ${agentName}`);
        }

        coderRunSession?.setRunnerState({
            runnerName: runner.name,
        });
        coderRunInfo(colors.green(`Running prompts with ${runner.name}`));
        const runnerMetadata = getRunnerMetadata(options, actualRunnerModel);
        coderRunSession?.setRunnerState({
            runnerName: runnerMetadata.runnerName,
            modelName: runnerMetadata.modelName,
        });

        let hasShownUpcomingTasks = false;
        let hasWaitedForStart = false;

        while (just(true)) {
            await coderRunSession?.checkPause();
            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            coderRunSession?.updateStats(stats);
            printStats(stats, options.priority);

            const nextPrompt = findNextTodoPrompt(promptFiles, options.priority);

            if (!hasShownUpcomingTasks) {
                if (stats.toBeWritten > 0) {
                    coderRunInfo(colors.yellow('Following prompts need to be written:'));
                    printPromptsToBeWritten(promptFiles, options.priority);
                    coderRunInfo('');
                }
                printUpcomingTasks(listUpcomingTasks(promptFiles, options.priority));
                hasShownUpcomingTasks = true;
            }

            if (!nextPrompt) {
                coderRunSession?.setCurrentPrompt(undefined);
                coderRunSession?.setThinkingMessage(undefined);
                if (stats.toBeWritten > 0) {
                    coderRunInfo(colors.yellow('No prompts ready for agent.'));
                } else {
                    coderRunInfo(colors.green('All prompts are done.'));
                }
                return;
            }

            if (options.waitForUser) {
                await waitForPromptStart(
                    nextPrompt.file,
                    nextPrompt.section,
                    !hasWaitedForStart,
                    waitForUserConfirmation,
                );
                hasWaitedForStart = true;
            }

            if (!options.ignoreGitChanges) {
                await ensureWorkingTreeClean();
            }

            const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
            const codexPrompt = appendCoderContext(
                buildCodexPrompt(nextPrompt.file, nextPrompt.section),
                resolvedCoderContext,
            );

            const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);
            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);
            const promptSummary = buildPromptSummary(nextPrompt.file, nextPrompt.section);
            coderRunSession?.setCurrentPrompt({
                label: promptLabel,
                summary: promptSummary,
                attemptCount: 1,
            });
            coderRunSession?.setThinkingMessage('Preparing runner...');

            coderRunInfo(colors.blue(`Processing ${promptLabel}`));

            const promptExecutionStartedDate = moment();
            let attemptCount = 1;
            const roundChangedFilesSnapshot = options.normalizeLineEndings
                ? await captureChangedFilesSnapshot(process.cwd())
                : undefined;

            try {
                const result = await runPromptWithTestFeedback({
                    runner,
                    prompt: codexPrompt,
                    scriptPath,
                    projectPath: process.cwd(),
                    promptLabel,
                    testCommand: options.testCommand,
                    onAttemptStarted: (nextAttemptCount) => {
                        attemptCount = nextAttemptCount;
                        coderRunSession?.setCurrentPrompt({
                            label: promptLabel,
                            summary: promptSummary,
                            attemptCount: nextAttemptCount,
                        });
                    },
                });

                markPromptDone(
                    nextPrompt.file,
                    nextPrompt.section,
                    result.usage,
                    runnerMetadata.runnerName,
                    runnerMetadata.modelName,
                    promptExecutionStartedDate,
                    result.attemptCount,
                );
                await writePromptFile(nextPrompt.file);
                await normalizeLineEndingsForCurrentRound(options, roundChangedFilesSnapshot);

                if (options.waitForUser) {
                    printCommitMessage(commitMessage);
                    await waitForUserConfirmation(colors.bgWhite('Press Enter to commit and continue...'));
                }

                await commitChanges(commitMessage, { noPush: options.noPush });
                await runPostPromptAutoMigrationIfEnabled(options, coderRunSession?.logger);
                coderRunSession?.setCurrentPrompt(undefined);
                coderRunSession?.setThinkingMessage(undefined);
            } catch (error) {
                markPromptFailed(
                    nextPrompt.file,
                    nextPrompt.section,
                    runnerMetadata.runnerName,
                    runnerMetadata.modelName,
                    promptExecutionStartedDate,
                    attemptCount,
                );
                await writePromptFile(nextPrompt.file);
                await writePromptErrorLog({
                    file: nextPrompt.file,
                    section: nextPrompt.section,
                    runnerName: runnerMetadata.runnerName,
                    modelName: runnerMetadata.modelName,
                    error,
                });
                await normalizeLineEndingsForCurrentRound(options, roundChangedFilesSnapshot);
                coderRunWarn(colors.yellow(`Prompt failed: ${promptLabel}`));

                throw error;
            }
        }
    } finally {
        coderRunSession?.stop();
        setCurrentCoderRunSession(undefined);
        if (!options.dryRun) {
            printAgentGitIdentityTipIfNeeded();
        }
    }
}

/**
 * Runs post-prompt testing-server auto-migration when enabled.
 */
async function runPostPromptAutoMigrationIfEnabled(options: RunOptions, logger?: { info(message: string): void; warn(message: string): void; error(message: string): void; }): Promise<void> {
    if (!options.autoMigrate) {
        return;
    }

    await runAutoMigrateTestingServers({
        allowDestructiveAutoMigrate: options.allowDestructiveAutoMigrate,
        logger,
    });
}

/**
 * Normalizes line endings in files modified during the current coding round.
 */
async function normalizeLineEndingsForCurrentRound(
    options: RunOptions,
    roundChangedFilesSnapshot?: ChangedFilesSnapshot,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundChangedFilesSnapshot) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath: process.cwd(),
            snapshot: roundChangedFilesSnapshot,
        });

        if (result.normalizedFiles > 0) {
            coderRunInfo(colors.gray(`Normalized line endings to LF in ${result.normalizedFiles} changed file(s).`));
        }
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        coderRunWarn(colors.yellow(`Automatic line-ending normalization failed: ${details}`));
    }
}
