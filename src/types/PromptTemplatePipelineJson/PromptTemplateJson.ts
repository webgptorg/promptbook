import {
    number_integer,
    number_positive_or_zero,
    string_javascript,
    string_javascript_name,
    string_markdown,
    string_name,
    string_prompt,
    string_template,
} from '../.././types/typeAliases';
import { ExpectFormatCommand } from '../Command';
import { ExecutionType } from '../ExecutionTypes';
import { ModelRequirements } from '../ModelRequirements';
import { ScriptLanguage } from '../ScriptLanguage';

/**
 * Describes one prompt template in the prompt template pipeline
 */
export type PromptTemplateJson = NaturalTemplateJson | SimpleTemplateJson | ScriptTemplateJson | PromptDialogJson;

/**
 * Template for prompt to LLM
 */
export interface NaturalTemplateJson extends PromptTemplateJsonCommon {
    readonly executionType: 'PROMPT_TEMPLATE';

    /**
     * Requirements for the model
     * - This is required only for executionType PROMPT_TEMPLATE
     */
    readonly modelRequirements?: ModelRequirements;
}

/**
 * Units of text measurement
 */
export const EXPECTATION_UNITS = ['CHARACTERS', 'WORDS', 'SENTENCES', 'PARAGRAPHS', 'LINES', 'PAGES'] as const;

/**
 * Unit of text measurement
 */
export type ExpectationUnit = typeof EXPECTATION_UNITS[number];

/**
 * Amount of text measurement
 */
export type ExpectationAmount = number_integer & number_positive_or_zero;

/**
 * Template for simple concatenation of strings
 */
interface SimpleTemplateJson extends PromptTemplateJsonCommon {
    readonly executionType: 'SIMPLE_TEMPLATE';
}

/**
 * Template for script execution
 */
interface ScriptTemplateJson extends PromptTemplateJsonCommon {
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
interface PromptDialogJson extends PromptTemplateJsonCommon {
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
     * - The ptbkUrl together with hash and name are used to identify the prompt template in the pipeline
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
    readonly description?: string;

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
    readonly expectAmount?: Partial<
        Record<Lowercase<ExpectationUnit>, { min?: ExpectationAmount; max?: ExpectationAmount }>
    >;

    /**
     * Expect this format of the answer
     *
     * Note: Expectations are performed after all postprocessing steps
     */
    readonly expectFormat?: ExpectFormatCommand['format'];

    /**
     * Name of the parameter that is the result of the prompt template
     */
    readonly resultingParameterName: string;
}

/**
 * TODO: use one helper type> (string_prompt | string_javascript | string_markdown) & string_template
 */
