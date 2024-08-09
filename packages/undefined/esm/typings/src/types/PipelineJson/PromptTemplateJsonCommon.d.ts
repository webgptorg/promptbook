import type { BlockType } from '../../commands/BLOCK/BlockTypes';
import type { ExpectFormatCommand } from '../../commands/EXPECT/ExpectFormatCommand';
import type { string_javascript } from '../typeAliases';
import type { string_javascript_name } from '../typeAliases';
import type { string_markdown } from '../typeAliases';
import type { string_markdown_text } from '../typeAliases';
import type { string_name } from '../typeAliases';
import type { string_parameter_name } from '../typeAliases';
import type { string_prompt } from '../typeAliases';
import type { string_template } from '../typeAliases';
import type { Expectations } from './Expectations';
/**
 * Common properties of all prompt templates
 */
export interface PromptTemplateJsonCommon {
    /**
     * Name of the template
     * - It must be unique across the pipeline
     * - It should start uppercase and can contain letters and numbers
     * - The pipelineUrl together with hash and name are used to identify the prompt template in the pipeline
     */
    readonly name: string_name;
    /**
     * Title of the prompt template
     * It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string;
    /**
     * Description of the prompt template
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;
    /**
     * List of parameter names that are used in the prompt template and must be defined before the prompt template is executed
     *
     * Note: Joker is one of the dependent parameters
     */
    readonly dependentParameterNames: Array<string_parameter_name>;
    /**
     * If theese parameters meet the expectations requirements, they are used instead of executing this prompt template
     *
     * @see https://github.com/webgptorg/promptbook/discussions/66
     */
    readonly jokerParameterNames?: Array<string_parameter_name>;
    /**
     * Type of the execution
     * This determines if the prompt template is send to LLM, user or some scripting evaluation
     */
    readonly blockType: BlockType;
    /**
     * Content of the template with {placeholders} for parameters
     *
     * @@@ content vs preparedContent
     */
    readonly content: (string_prompt | string_javascript | string_markdown) & string_template;
    /**
     * @@@ Content of the template with {placeholders} for parameters
     *
     * @@@ content vs preparedContent
     *
     * @default "{content}"
     */
    readonly preparedContent?: (string_prompt | string_javascript | string_markdown) & string_template;
    /**
     * List of postprocessing steps that are executed after the prompt template
     *
     * @see https://github.com/webgptorg/promptbook/discussions/31
     */
    readonly postprocessingFunctionNames?: Array<string_javascript_name>;
    /**
     * Expect this amount of each unit in the answer
     *
     * For example 5 words, 3 sentences, 2 paragraphs, ...
     *
     * Note: Expectations are performed after all postprocessing steps
     * @see https://github.com/webgptorg/promptbook/discussions/30
     */
    readonly expectations?: Expectations;
    /**
     * Expect this format of the answer
     *
     * Note: Expectations are performed after all postprocessing steps
     * @see https://github.com/webgptorg/promptbook/discussions/30
     * @deprecated [💝]
     */
    readonly expectFormat?: ExpectFormatCommand['format'];
    /**
     * Name of the parameter that is the result of the prompt template
     */
    readonly resultingParameterName: string_name;
}
/**
 * TODO: [🧠][🥜]
 * TODO: use one helper type> (string_prompt | string_javascript | string_markdown) & string_template
 * TODO: [♈] Probbably move expectations from templates to parameters
 */
