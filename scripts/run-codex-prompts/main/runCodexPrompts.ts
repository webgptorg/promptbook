import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { printCommitMessage } from '../common/printCommitMessage';
import { waitForEnter } from '../common/waitForEnter';
import { checkPause, listenForPause } from '../common/waitForPause';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { listUpcomingTasks } from '../prompts/listUpcomingTasks';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { markPromptDone } from '../prompts/markPromptDone';
import { printPromptsToBeWritten } from '../prompts/printPromptsToBeWritten';
import { printStats } from '../prompts/printStats';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { summarizePrompts } from '../prompts/summarizePrompts';
import { waitForPromptStart } from '../prompts/waitForPromptStart';
import { writePromptFile } from '../prompts/writePromptFile';
import { ClaudeCodeRunner } from '../runners/claude-code/ClaudeCodeRunner';
import { ClineRunner } from '../runners/cline/ClineRunner';
import { DEFAULT_GEMINI_MODEL, GeminiRunner } from '../runners/gemini/GeminiRunner';
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import type { PromptRunner } from '../runners/types/PromptRunner';

const PROMPTS_DIR = join(process.cwd(), 'prompts');
const DEFAULT_CODEX_MODEL = 'gpt-5.2-codex';
const CLINE_MODEL = 'gemini:gemini-3-flash-preview';

type RunnerAgentName = NonNullable<RunOptions['agentName']>;

const RUNNER_LABELS: Record<RunnerAgentName, string> = {
    'openai-codex': 'OpenAI Codex',
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
 */
export async function runCodexPrompts(): Promise<void> {
    const options = parseRunOptions(process.argv.slice(2));
    const runStartDate = moment();
    const progressDisplay = options.dryRun ? undefined : new CliProgressDisplay(runStartDate);
    progressDisplay?.update({ done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 });
    listenForPause();

    try {
        if (options.dryRun) {
            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            printStats(stats, options.priority);
            console.info(colors.yellow('Following prompts need to be written:'));
            printPromptsToBeWritten(promptFiles, options.priority);
            return;
        }

        let runner: PromptRunner;
        let actualCodexModel: string | undefined;
        let actualGeminiModel: string | undefined;
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

            actualCodexModel = modelToUse;
            runner = new OpenAiCodexRunner({
                codexCommand: 'codex',
                model: modelToUse,
                sandbox: 'danger-full-access',
                askForApproval: 'never',
            });
        } else if (agentName === 'cline') {
            runner = new ClineRunner({
                model: CLINE_MODEL,
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

            actualGeminiModel = modelToUse;
            runner = new GeminiRunner({
                model: modelToUse,
            });
        } else {
            throw new Error(`Unknown agent: ${agentName}`);
        }

        console.info(colors.green(`Running prompts with ${runner.name}`));
        const runnerMetadata = getRunnerMetadata(options, actualCodexModel ?? actualGeminiModel);

        let hasShownUpcomingTasks = false;
        let hasWaitedForStart = false;

        while (just(true)) {
            await checkPause();
            const promptFiles = await loadPromptFiles(PROMPTS_DIR);
            const stats = summarizePrompts(promptFiles, options.priority);
            progressDisplay?.update(stats);
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
                if (stats.toBeWritten > 0) {
                    console.info(colors.yellow('No prompts ready for agent.'));
                } else {
                    console.info(colors.green('All prompts are done.'));
                }
                return;
            }

            if (options.waitForUser) {
                await waitForPromptStart(nextPrompt.file, nextPrompt.section, !hasWaitedForStart);
                hasWaitedForStart = true;
            }

            if (!options.ignoreGitChanges) {
                await ensureWorkingTreeClean();
            }

            const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
            const codexPrompt = buildCodexPrompt(nextPrompt.file, nextPrompt.section);

            const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);
            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);

            console.info(colors.blue(`Processing ${promptLabel}`));

            const promptExecutionStartedDate = moment();
            const result = await runner.runPrompt({
                prompt: codexPrompt,
                scriptPath,
                projectPath: process.cwd(),
            });

            markPromptDone(
                nextPrompt.file,
                nextPrompt.section,
                result.usage,
                runnerMetadata.runnerName,
                runnerMetadata.modelName,
                promptExecutionStartedDate,
            );
            await writePromptFile(nextPrompt.file);

            if (options.waitForUser) {
                printCommitMessage(commitMessage);
                await waitForEnter(colors.bgWhite('Press Enter to commit and continue...'));
            }

            await commitChanges(commitMessage);
        }
    } finally {
        progressDisplay?.stop();
    }
}
