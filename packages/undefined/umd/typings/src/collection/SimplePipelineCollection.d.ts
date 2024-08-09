import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { Prompt } from '../types/Prompt';
import type { string_pipeline_url } from '../types/typeAliases';
import type { PipelineCollection } from './PipelineCollection';
/**
 * Library of pipelines that groups together pipelines for an application.
 * This implementation is a very thin wrapper around the Array / Map of pipelines.
 *
 * @private use `createCollectionFromJson` instead
 * @see https://github.com/webgptorg/pipeline#pipeline-collection
 */
export declare class SimplePipelineCollection implements PipelineCollection {
    private collection;
    /**
     * Constructs a pipeline collection from pipelines
     *
     * @param pipelines @@@
     *
     * @private Use instead `createCollectionFromJson`
     * Note: During the construction logic of all pipelines are validated
     * Note: It is not recommended to use this constructor directly, use `createCollectionFromJson` *(or other variant)* instead
     */
    constructor(...pipelines: Array<PipelineJson>);
    /**
     * Gets all pipelines in the collection
     */
    listPipelines(): Array<string_pipeline_url>;
    /**
     * Gets pipeline by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the collection
     */
    getPipelineByUrl(url: string_pipeline_url): PipelineJson;
    /**
     * Checks whether given prompt was defined in any pipeline in the collection
     */
    isResponsibleForPrompt(prompt: Prompt): boolean;
}
