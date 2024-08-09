import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';
/**
 * Template for prompt to user
 *
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export type PromptDialogJson = PromptTemplateJsonCommon & {
    readonly blockType: 'PROMPT_DIALOG';
};
/**
 * TODO: [🧠][🥜]
 * TODO: [🍙] Make some standart order of json properties
 */
