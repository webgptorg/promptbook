import colors from 'colors';
import { join } from 'path';
import { listPromptsToBeWritten } from '../prompts/listPromptsToBeWritten';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { printPromptsToBeWritten } from '../prompts/printPromptsToBeWritten';
import { printStats } from '../prompts/printStats';
import { summarizePrompts } from '../prompts/summarizePrompts';

/**
 * Options for `findUnwrittenPrompts`.
 */
export type FindUnwrittenPromptsOptions = {
    /**
     * Minimum priority level — sections below this threshold are excluded.
     * @default 0
     */
    readonly priority?: number;
};

/**
 * Constant for prompts dir — mirrors the constant in `runCodexPrompts.ts`.
 */
const PROMPTS_DIR = join(process.cwd(), 'prompts');

/**
 * Lists and prints all prompt sections that still need to be authored (contain `@@@` placeholder).
 *
 * Reuses the same filtering logic as `ptbk coder run --dry-run`.
 *
 * @returns the number of unwritten prompts found
 * @public exported from `@promptbook/cli`
 */
export async function findUnwrittenPrompts(options: FindUnwrittenPromptsOptions = {}): Promise<number> {
    const { priority = 0 } = options;

    const promptFiles = await loadPromptFiles(PROMPTS_DIR);
    const stats = summarizePrompts(promptFiles, priority);
    printStats(stats, priority);

    const unwrittenPrompts = listPromptsToBeWritten(promptFiles, priority);

    if (unwrittenPrompts.length === 0) {
        console.info(colors.green('All prompts are written — nothing to do.'));
    } else {
        console.info(colors.yellow(`Found ${unwrittenPrompts.length} prompt(s) that need to be written:`));
        printPromptsToBeWritten(promptFiles, priority);
    }

    return unwrittenPrompts.length;
}
