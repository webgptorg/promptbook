import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { appendCoderContext } from '../common/appendCoderContext';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../common/normalizeLineEndingsInChangedFiles';
import { printCommitMessage } from '../common/printCommitMessage';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { waitForEnter } from '../common/waitForEnter';
import { checkPause, listenForPause } from '../common/waitForPause';
import { printAgentGitIdentityTipIfNeeded } from '../git/agentGitIdentity';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
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
import { CoderRunTerminalSession } from '../ui/CoderRunTerminalSession';

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
    let progressDisplay: CliProgressDisplay | undefined;
    let terminalSession: CoderRunTerminalSession | undefined;

    if (options.allowDestructiveAutoMigrate && !options.autoMigrate) {
        throw new DatabaseError(
            spaceTrim(`
                Flag \`--allow-destructive-auto-migrate\` requires \`--auto-migrate\`.
            `),
        );
    }

    const runStartDate = moment();
    const waitForEnterImplementation = async (prompt: string): Promise<void> => {
        if (terminalSession) {
            return terminalSession.waitForEnter(prompt);
        }

        return waitForEnter(prompt);
    };

    try {
        const resolvedCoderContext = await resolveCoderContext(options.context, process.cwd());

        if (options.dryRun) {
            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            printStats(stats, options.priority);
            console.info(colors.yellow('Following prompts need to be written:'));
            printPromptsToBeWritten(promptFiles, options.priority);
            return;
        }

        let runner: PromptRunner;
        let actualRunnerModel: string | undefined;
        let shouldPrintAllowCreditsTip = false;
        const agentName = options.agentName;

        if (!agentName) {
            throw new Error('Missing --agent in non-dry run mode');
        }

        if (agentName === 'openai-codex') {
            let modelToUse: string;
            if (!options.model) {
                console.error(colors.red('Error: --model is required when using --agent openai-codex'));
                console.error('');
                console.error(colors.cyan('Available models:'));
                const codexModels = OPENAI_MODELS.filter((m) => m.modelVariant === 'CHAT').map((m) => m.modelName);
                codexModels.forEach((model) => {
                    console.error(colors.gray(`  - ${model}`));
                });
                console.error('');
                console.error(colors.cyan('Example usage:'));
                console.error(colors.gray(`  --agent openai-codex --model gpt-5.2-codex`));
                console.error(colors.gray(`  --agent openai-codex --model default`));
                process.exit(1);
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
                shouldPrintAllowCreditsTip = true;
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
            });
        } else if (agentName === 'claude-code') {
            runner = new ClaudeCodeRunner();
        } else if (agentName === 'opencode') {
            runner = new OpencodeRunner({
                model: options.model,
            });
        } else if (agentName === 'gemini') {
            let modelToUse: string;
            if (!options.model) {
                console.error(colors.red('Error: --model is required when using --agent gemini'));
                console.error('');
                console.error(colors.cyan('Example usage:'));
                console.error(colors.gray(`  --agent gemini --model ${DEFAULT_GEMINI_MODEL}`));
                console.error(colors.gray('  --agent gemini --model default'));
                process.exit(1);
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

        const runnerMetadata = getRunnerMetadata(options, actualRunnerModel);
        terminalSession = await CoderRunTerminalSession.create({
            runOptions: options,
            runStartDate,
        });
        terminalSession?.updateRunnerMetadata(runnerMetadata.runnerName, runnerMetadata.modelName);
        progressDisplay = terminalSession ? undefined : new CliProgressDisplay(runStartDate);

        if (!terminalSession) {
            listenForPause();
        }

        if (shouldPrintAllowCreditsTip) {
            console.info(
                colors.gray('OpenAI Codex credit spending is disabled. Use `--allow-credits` to explicitly opt in.'),
            );
        }

        console.info(colors.green(`Running prompts with ${runner.name}`));

        let hasShownUpcomingTasks = false;
        let hasWaitedForStart = false;

        while (just(true)) {
            if (terminalSession) {
                await terminalSession.checkPause();
            } else {
                await checkPause();
            }

            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            progressDisplay?.update(stats);
            terminalSession?.updateStats(stats);
            printStats(stats, options.priority);

            const nextPrompt = findNextTodoPrompt(promptFiles, options.priority);

            if (!hasShownUpcomingTasks) {
                if (stats.toBeWritten > 0) {
                    console.info(colors.yellow('Following prompts need to be written:'));
                    printPromptsToBeWritten(promptFiles, options.priority);
                    console.info('');
                }
                printUpcomingTasks(listUpcomingTasks(promptFiles, options.priority));
                hasShownUpcomingTasks = true;
            }

            if (!nextPrompt) {
                terminalSession?.setCurrentPrompt(undefined);
                if (stats.toBeWritten > 0) {
                    console.info(colors.yellow('No prompts ready for agent.'));
                } else {
                    console.info(colors.green('All prompts are done.'));
                }
                return;
            }

            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);
            terminalSession?.setCurrentPrompt(promptLabel);

            if (options.waitForUser) {
                await waitForPromptStart(
                    nextPrompt.file,
                    nextPrompt.section,
                    !hasWaitedForStart,
                    waitForEnterImplementation,
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

            console.info(colors.blue(`Processing ${promptLabel}`));

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
                        terminalSession?.setCurrentAttempt(nextAttemptCount);
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
                    await waitForEnterImplementation(colors.bgWhite('Press Enter to commit and continue...'));
                }

                await commitChanges(commitMessage, { noPush: options.noPush });
                await runPostPromptAutoMigrationIfEnabled(options);
                terminalSession?.setCurrentAttempt(undefined);
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
                terminalSession?.setCurrentAttempt(undefined);

                throw error;
            }
        }
    } finally {
        progressDisplay?.stop();
        if (!options.dryRun) {
            printAgentGitIdentityTipIfNeeded();
        }
        terminalSession?.stop();
    }
}

/**
 * Runs post-prompt testing-server auto-migration when enabled.
 */
async function runPostPromptAutoMigrationIfEnabled(options: RunOptions): Promise<void> {
    if (!options.autoMigrate) {
        return;
    }

    await runAutoMigrateTestingServers({
        allowDestructiveAutoMigrate: options.allowDestructiveAutoMigrate,
        logger: console,
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
            console.info(colors.gray(`Normalized line endings to LF in ${result.normalizedFiles} changed file(s).`));
        }
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(colors.yellow(`Automatic line-ending normalization failed: ${details}`));
    }
}
