import type { ExpectFormatCommand } from '../commands/EXPECT/ExpectFormatCommand';
import type { PostprocessingFunction } from '../scripting/javascript/JavascriptExecutionToolsOptions';
import type { ModelRequirements } from './ModelRequirements';
import type { Expectations } from './PipelineJson/Expectations';
import type {
    string_parameter_name,
    string_parameter_value,
    string_pipeline_url_with_hashtemplate,
    string_prompt,
    string_title,
} from './typeAliases';

/**
 * Prompt in a text along with model requirements, but without any execution or templating logic.
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 * @see https://github.com/webgptorg/promptbook#prompt
 */
export type Prompt = CompletionPrompt | ChatPrompt | EmbeddingPrompt /* <- [🤖] */;

/**
 * Completion prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type CompletionPrompt = CommonPrompt;

/**
 * Chat prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type ChatPrompt = CommonPrompt & {
    // TODO: [🤹‍♂️][🧠] Figure out way how to pass thread / previous messages
};

/**
 * Embedding prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type EmbeddingPrompt = CommonPrompt;

// <- Note: [🤖] Add new model variant here

/**
 * Common properties for all prompt results
 *
 * Note: This is fully serializable as JSON
 */
export type CommonPrompt = {
    /**
     * The title of the prompt
     *
     * Note: This has no effect on the model, it is just for the reporting
     */
    readonly title: string_title;

    /**
     * The text of the prompt
     *
     * Note: This is not a template, this is exactly the text that will be sent to the model
     * @example "What is the capital of France?"
     */
    readonly content: string_prompt;

    /**
     * Requirements for the model
     */
    readonly modelRequirements: ModelRequirements;
    // <- TODO: !!!!!!!! Split `ModelRequirements` into `CommonModelRequirements`, `ChatModelRequirements`,... + [🔼]

    /**
     * List of postprocessing steps that are executed after the prompt
     */
    readonly postprocessing?: Array<PostprocessingFunction>;

    /**
     * Expectations for the answer
     *
     * For example 5 words, 3 sentences, 2 paragraphs, ...
     * If not set, nothing is expected from the answer
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
     * Unique identifier of the pipeline with specific template name as hash
     *
     * @example https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md#keywords
     */
    readonly pipelineUrl?: string_pipeline_url_with_hashtemplate;

    /**
     * Parameters used in the prompt
     *
     * Note: This is redundant (same information is in pipelineUrl+content) but useful for logging and debugging
     */
    readonly parameters: Record<string_parameter_name, string_parameter_value>;

    // <- Note: [🧆] Look here when adding new properties to `Prompt`
};

/**
 * TODO: [🔼] !!!! Export all from `@promptbook/types`
 * TODO: Replace all "github.com/webgptorg/promptbook#xxx" with "ptbk.io/xxx"
 * TODO: [✔] Check ModelRequirements in runtime
 * TODO: [🏳] Add options for translation - maybe create `TranslationPrompt`
 */
