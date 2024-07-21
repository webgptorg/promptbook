import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to user
 */
export interface PromptDialogJson extends PromptTemplateJsonCommon {
    readonly executionType: 'PROMPT_DIALOG';
}
