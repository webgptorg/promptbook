import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { buildCodexPrompt } from './buildCodexPrompt';

/**
 * Checks whether a prompt section still needs authoring (contains "@@@").
 */
export function isPromptToBeWritten(file: PromptFile, section: PromptSection): boolean {
    return buildCodexPrompt(file, section).includes('@@@');
}
