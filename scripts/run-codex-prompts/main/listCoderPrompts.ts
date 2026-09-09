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
    /**
     * Optional harness and model selection used to omit prompts routed to other runners.
     */
    readonly promptRunnerIdentity?: PromptRunnerIdentity;
};

/**
 * Directory containing the prompt queue of the current project.
 *
 * @private internal constant of `listCoderPrompts`
 */
const PROMPTS_DIRECTORY_PATH = join(process.cwd(), 'prompts');

/**
 * Lists ready, fully authored coding prompts in descending priority groups without starting a coding harness.
 *
 * @returns The number of prompts printed.
 * @public exported from `@promptbook/cli`
 */
export async function listCoderPrompts(options: ListCoderPromptsOptions = {}): Promise<number> {
    const priorityFilter = normalizePriorityFilter(options);
    const promptFiles = await loadPromptFiles(PROMPTS_DIRECTORY_PATH);
    const upcomingTasks = listUpcomingTasks(promptFiles, priorityFilter, options.promptRunnerIdentity);

    printUpcomingTasks(upcomingTasks);
    return upcomingTasks.length;
}
