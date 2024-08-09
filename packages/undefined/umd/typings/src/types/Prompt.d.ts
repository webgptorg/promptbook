import type { ExpectFormatCommand } from '../commands/EXPECT/ExpectFormatCommand';
import type { PostprocessingFunction } from '../scripting/javascript/JavascriptExecutionToolsOptions';
import type { ChatModelRequirements } from './ModelRequirements';
import type { CompletionModelRequirements } from './ModelRequirements';
import type { EmbeddingModelRequirements } from './ModelRequirements';
import type { ModelRequirements } from './ModelRequirements';
import type { Expectations } from './PipelineJson/Expectations';
import type { Parameters } from './typeAliases';
import type { string_pipeline_url_with_hashtemplate } from './typeAliases';
import type { string_prompt } from './typeAliases';
import type { string_template } from './typeAliases';
import type { string_title } from './typeAliases';
/**
 * Prompt in a text along with model requirements, but without any execution or templating logic.
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 * @see https://github.com/webgptorg/promptbook#prompt
 */
export type Prompt = CompletionPrompt | ChatPrompt | EmbeddingPrompt;
/**
 * Completion prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type CompletionPrompt = CommonPrompt & {
    /**
     * Requirements for completion model
     */
    modelRequirements: CompletionModelRequirements;
};
/**
 * Chat prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type ChatPrompt = CommonPrompt & {
    /**
     * Requirements for chat model
     */
    modelRequirements: ChatModelRequirements;
};
/**
 * Embedding prompt
 *
 * Note: [🛫] This is NOT fully serializable as JSON, it contains functions which are not serializable
 */
export type EmbeddingPrompt = CommonPrompt & {
    /**
     * Requirements for chat model
     */
    modelRequirements: EmbeddingModelRequirements;
};
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
     * The text of the prompt with placeholders for parameters
     *
     * @example "What is the capital of {country}?"
     */
    readonly content: string_prompt & string_template;
    /**
     * Requirements for the model
     */
    readonly modelRequirements: ModelRequirements;
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
     * Parameters used in the `content`
     */
    readonly parameters: Parameters;
};
/**
 * TODO: [🧄] Replace all "github.com/webgptorg/promptbook#xxx" with "ptbk.io/xxx"
 * TODO: [✔] Check ModelRequirements in runtime
 * TODO: [🏳] Add options for translation - maybe create `TranslationPrompt`
 */
