import { join } from 'path';
import { listUpcomingTasks } from '../prompts/listUpcomingTasks';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { normalizePriorityFilter, type PriorityFilterInput } from '../prompts/priorityFilter';
import type { PromptRunnerIdentity } from '../prompts/isPromptCompatibleWithRunner';

/**
 * Options which select the ready prompts listed by `ptbk coder list`.
 *
 * @public exported from `@promptbook/cli`
 */
export type ListCoderPromptsOptions = PriorityFilterInput & {
    /** Resolved project directory supplied by the CLI. */
    readonly projectPath?: string;
    /**
     * Optional harness, model and Book-agent selection used to omit prompts routed to other runners.
     */
    readonly promptRunnerIdentity?: PromptRunnerIdentity;
};

/**
 * Lists ready, fully authored coding prompts in descending priority groups without starting a coding harness.
 *
 * @returns The number of prompts printed.
 * @public exported from `@promptbook/cli`
 */
export async function listCoderPrompts(options: ListCoderPromptsOptions = {}): Promise<number> {
    const priorityFilter = normalizePriorityFilter(options);
    const promptFiles = await loadPromptFiles(join(options.projectPath ?? process.cwd(), 'prompts'), {
        isMissingDirectoryAllowed: true,
    });
    const upcomingTasks = listUpcomingTasks(promptFiles, priorityFilter, options.promptRunnerIdentity);

    printUpcomingTasks(upcomingTasks);
    return upcomingTasks.length;
}
