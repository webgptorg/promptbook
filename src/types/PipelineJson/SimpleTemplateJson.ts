import type { TemplateJsonCommon } from './TemplateJsonCommon';

/**
 * Template for simple concatenation of strings
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/17
 */
export type SimpleTemplateJson = TemplateJsonCommon & {
    readonly blockType: 'SIMPLE_TEMPLATE';
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
