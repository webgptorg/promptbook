import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';
/**
 * Template for simple concatenation of strings
 *
 * @see https://github.com/webgptorg/promptbook/discussions/17
 */
export type SimpleTemplateJson = PromptTemplateJsonCommon & {
    readonly blockType: 'SIMPLE_TEMPLATE';
};
/**
 * TODO: [🍙] Make some standart order of json properties
 */
