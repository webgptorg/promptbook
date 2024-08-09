import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { PrepareOptions } from './PrepareOptions';
type PrepareTemplateInput = Pick<PipelineJson, 'promptTemplates' | 'parameters'> & {
    /**
     * @@@
     */
    readonly knowledgePiecesCount: number;
};
type PreparedTemplates = {
    /**
     * @@@ Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplatesPrepared: Array<PromptTemplateJson>;
};
/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export declare function prepareTemplates(pipeline: PrepareTemplateInput, options: PrepareOptions): Promise<PreparedTemplates>;
export {};
/**
 * TODO: [🧠] Add context to each template (if missing)
 * TODO: [🧠] What is better name `prepareTemplate` or `prepareTemplateAndParameters`
 * TODO: [♨] !!! Prepare index the samples and maybe templates
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][🥜]
 */
