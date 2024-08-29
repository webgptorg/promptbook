import type { TemplateJsonCommon } from './TemplateJsonCommon';

/**
 * Template for prompt to user
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export type PromptDialogJson = TemplateJsonCommon & {
    readonly blockType: 'PROMPT_DIALOG';
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
