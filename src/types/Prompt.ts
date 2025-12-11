import type { FormatCommand } from '../commands/FORMAT/FormatCommand';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';
import type { Expectations } from '../pipeline/PipelineJson/Expectations';
import type { ChatModelRequirements } from './ModelRequirements';
import type { CompletionModelRequirements } from './ModelRequirements';
import type { EmbeddingModelRequirements } from './ModelRequirements';
import type { ImageGenerationModelRequirements } from './ModelRequirements';
import type { ModelRequirements } from './ModelRequirements';
import type { Parameters } from './typeAliases';
import type { string_pipeline_url_with_task_hash } from './typeAliases';
import type { string_postprocessing_function_name } from './typeAliases';
import type { string_prompt } from './typeAliases';
import type { string_template } from './typeAliases';
import type { string_title } from './typeAliases';

/**
 * Prompt in a text along with model requirements, but without any execution or templating logic.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook#prompt
 */
export type Prompt = CompletionPrompt | ChatPrompt | ImagePrompt | EmbeddingPrompt /* <- [🤖] */;

/**
 * Completion prompt
 *
 * Note: [🚉] This is fully serializable as JSON
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
 * Note: [🚉] This is fully serializable as JSON
 */
export type ChatPrompt = CommonPrompt & {
    /**
     * Requirements for chat model
     */
    modelRequirements: ChatModelRequirements;

    /**
     * Optional chat thread (history of previous messages)
     */
    thread?: ChatMessage[];
};

/**
 * Image prompt
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ImagePrompt = CommonPrompt & {
    /**
     * Requirements for image generation model
     */
    modelRequirements: ImageGenerationModelRequirements;
};

/**
 * Embedding prompt
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type EmbeddingPrompt = CommonPrompt & {
    /**
     * Requirements for chat model
     */
    modelRequirements: EmbeddingModelRequirements;

    // <-TODO: [🗯][🧠] Figure out way how to pass thread / previous messages
};

// <- Note: [🤖] Add new model variant here

/**
 * Common properties for all prompt results
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private just abstract the common properties of the prompts
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
    readonly postprocessingFunctionNames?: ReadonlyArray<string_postprocessing_function_name>;

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
    readonly format?: FormatCommand['format'];

    /**
     * Unique identifier of the pipeline with specific task name as hash
     *
     * @example https://promptbook.studio/webgpt/write-website-content-cs.book#keywords
     */
    readonly pipelineUrl?: string_pipeline_url_with_task_hash;

    /**
     * Parameters used in the `content`
     */
    readonly parameters: Parameters;

    // <- Note: [🧆] Look here when adding new properties to `Prompt`
};

/**
 * TODO: [🧄] Replace all "github.com/webgptorg/promptbook#xxx" with "ptbk.io/xxx"
 * TODO: [✔] Check ModelRequirements in runtime
 * TODO: [🏳] Add options for translation - maybe create `TranslationPrompt`
 * TODO: [🧠][🤺] Maybe allow overriding of `userId` for each prompt
 */
