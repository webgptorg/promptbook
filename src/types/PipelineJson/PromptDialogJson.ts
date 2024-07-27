import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to user
 *
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export interface PromptDialogJson extends PromptTemplateJsonCommon {
    readonly blockType: 'PROMPT_DIALOG';
}
