import colors from 'colors';
import { waitForEnter } from '../common/waitForEnter';
import { printPromptStartSummary } from './printPromptStartSummary';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Waits for user confirmation before starting the next prompt.
 */
export async function waitForPromptStart(
    file: PromptFile,
    section: PromptSection,
    isFirstPrompt: boolean,
): Promise<void> {
    printPromptStartSummary(file, section);
    const label = isFirstPrompt ? 'first task' : 'next task';
    await waitForEnter(colors.bgWhite(`Press Enter to start the ${label}...`));
}
