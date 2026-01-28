import colors from 'colors';
import { join } from 'path';
import { just } from '../../../src/utils/organization/just';
import { parseRunOptions } from '../cli/parseRunOptions';
import { printCommitMessage } from '../common/printCommitMessage';
import { waitForEnter } from '../common/waitForEnter';
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
import { OpenAiCodexRunner } from '../runners/openai-codex/OpenAiCodexRunner';
import { OpencodeRunner } from '../runners/opencode/OpencodeRunner';
import type { PromptRunner } from '../runners/types/PromptRunner';

const PROMPTS_DIR = join(process.cwd(), 'prompts');

/**
 * Main entry point for running prompts with the selected agent.
 */
export async function runCodexPrompts(): Promise<void> {
    const options = parseRunOptions(process.argv.slice(2));

    let runner: PromptRunner;

    if (options.agentName === 'openai-codex') {
        runner = new OpenAiCodexRunner({
            codexCommand: 'codex',
            model: 'gpt-5.2-codex',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
        });
    } else if (options.agentName === 'cline') {
        runner = new ClineRunner({
            model: 'gemini:gemini-3-flash-preview',
        });
    } else if (options.agentName === 'claude-code') {
        runner = new ClaudeCodeRunner();
    } else if (options.agentName === 'opencode') {
        runner = new OpencodeRunner({
            model: options.model,
        });
    } else {
        throw new Error(`Unknown agent: ${options.agentName}`);
    }

    console.info(colors.green(`Running prompts with ${runner.name}`));

    let hasShownUpcomingTasks = false;
    let hasWaitedForStart = false;

    while (just(true)) {
        const promptFiles = await loadPromptFiles(PROMPTS_DIR);
        const stats = summarizePrompts(promptFiles);
        printStats(stats);

        const nextPrompt = findNextTodoPrompt(promptFiles);

        if (!hasShownUpcomingTasks) {
            if (stats.toBeWritten > 0) {
                console.info(colors.yellow('Following prompts need to be written:'));
                printPromptsToBeWritten(promptFiles);
                console.info('');
            }
            printUpcomingTasks(listUpcomingTasks(promptFiles));
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

        await ensureWorkingTreeClean();

        const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
        const codexPrompt = buildCodexPrompt(nextPrompt.file, nextPrompt.section);

        const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);
        const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);

        console.info(colors.blue(`Processing ${promptLabel}`));

        const result = await runner.runPrompt({
            prompt: codexPrompt,
            scriptPath,
            projectPath: process.cwd(),
        });

        markPromptDone(nextPrompt.file, nextPrompt.section, result.usage);
        await writePromptFile(nextPrompt.file);

        if (options.waitForUser) {
            printCommitMessage(commitMessage);
            await waitForEnter(colors.bgWhite('Press Enter to commit and continue...'));
        }

        await commitChanges(commitMessage);
    }
}
