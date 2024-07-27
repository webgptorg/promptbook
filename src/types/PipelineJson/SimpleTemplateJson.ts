import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for simple concatenation of strings
 *
 * @see https://github.com/webgptorg/promptbook/discussions/17
 */
export interface SimpleTemplateJson extends PromptTemplateJsonCommon {
    readonly blockType: 'SIMPLE_TEMPLATE';
}
