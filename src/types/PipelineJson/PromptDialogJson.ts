import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to user
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export type PromptDialogJson = PromptTemplateJsonCommon & {
    readonly blockType: 'PROMPT_DIALOG';
};

/**
 * TODO: [🧠][🥜]
 * TODO: [🍙] Make some standard order of json properties
 */
