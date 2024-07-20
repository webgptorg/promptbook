import type { ExpectFormatCommand } from '../../commands/EXPECT/ExpectFormatCommand';
import type { ExecutionType } from '../../commands/EXECUTE/ExecutionTypes';
import type { ModelRequirements } from '../ModelRequirements';
import type { ScriptLanguage } from '../ScriptLanguage';
import type { number_integer } from '../typeAliases';
import type { number_positive } from '../typeAliases';
import type { string_javascript } from '../typeAliases';
import type { string_javascript_name } from '../typeAliases';
import type { string_markdown } from '../typeAliases';
import type { string_markdown_text } from '../typeAliases';
import type { string_name } from '../typeAliases';
import type { string_prompt } from '../typeAliases';
import type { string_template } from '../typeAliases';

/**
 * Describes one prompt template in the promptbook
 */
export type PromptTemplateJson = LlmTemplateJson | SimpleTemplateJson | ScriptJson | PromptDialogJson;

/**
 * Template for prompt to LLM
 */
export type LlmTemplateJson = PromptTemplateJsonCommon & {
    readonly executionType: 'PROMPT_TEMPLATE';

    /**
     * Requirements for the model
     * - This is required only for executionType PROMPT_TEMPLATE
     */
    readonly modelRequirements: ModelRequirements; // <- TODO: !!! Make Partial<ModelRequirements> and optional;
};

/**
 * Expect this amount of each unit in the answer
 *
 * For example 5 words, 3 sentences, 2 paragraphs, ...
 *
 * Note: Expectations are performed after all postprocessing steps
 */
export type Expectations = Partial<
    Record<Lowercase<ExpectationUnit>, { min?: ExpectationAmount; max?: ExpectationAmount }>
>;

/**
 * Units of text measurement
 */
export const EXPECTATION_UNITS = ['CHARACTERS', 'WORDS', 'SENTENCES', 'LINES', 'PARAGRAPHS', 'PAGES'] as const;

/**
 * Unit of text measurement
 */
export type ExpectationUnit = typeof EXPECTATION_UNITS[number];

/**
 * Amount of text measurement
 */
export type ExpectationAmount = number_integer & (number_positive | 0);

/**
 * Template for simple concatenation of strings
 */
export interface SimpleTemplateJson extends PromptTemplateJsonCommon {
    readonly executionType: 'SIMPLE_TEMPLATE';
}

/**
 * Template for script execution
 */
export interface ScriptJson extends PromptTemplateJsonCommon {
    readonly executionType: 'SCRIPT';

    /**
     * Language of the script
     * - This is required only for executionType SCRIPT
     *
     */
    readonly contentLanguage?: ScriptLanguage;
}

/**
 * Template for prompt to user
 */
export interface PromptDialogJson extends PromptTemplateJsonCommon {
    readonly executionType: 'PROMPT_DIALOG';
}

/**
 * Common properties of all prompt templates
 */
interface PromptTemplateJsonCommon {
    /**
     * Name of the template
     * - It must be unique across the pipeline
     * - It should start uppercase and contain letters and numbers
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
    readonly dependentParameterNames: Array<string_name>;

    /**
     * If theese parameters meet the expectations requirements, they are used instead of executing this prompt template
     */
    readonly jokers?: Array<string>;

    /**
     * Type of the execution
     * This determines if the prompt template is send to LLM, user or some scripting evaluation
     */
    readonly executionType: ExecutionType;

    /**
     * Content of the template with {placeholders} for parameters
     */
    readonly content: (string_prompt | string_javascript | string_markdown) & string_template;

    /**
     * List of postprocessing steps that are executed after the prompt template
     */
    readonly postprocessing?: Array<string_javascript_name>;

    /**
     * Expect this amount of each unit in the answer
     *
     * For example 5 words, 3 sentences, 2 paragraphs, ...
     *
     * Note: Expectations are performed after all postprocessing steps
     */
    readonly expectations?: Expectations;

    /**
     * Expect this format of the answer
     *
     * Note: Expectations are performed after all postprocessing steps
     * @deprecated [💝]
     */
    readonly expectFormat?: ExpectFormatCommand['format'];

    /**
     * Name of the parameter that is the result of the prompt template
     */
    readonly resultingParameterName: string_name;
}

/**
 * TODO: [💝] Unite object for expecting amount and format - remove expectFormat
 * TODO: use one helper type> (string_prompt | string_javascript | string_markdown) & string_template
 * TODO: [👙][🧠] Just selecting gpt3 or gpt4 level of model
 */
