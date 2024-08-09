import type { Promisable } from 'type-fest';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { Prompt } from '../types/Prompt';
import type { string_pipeline_url } from '../types/typeAliases';
/**
 * Collection that groups together pipelines, knowledge, personas, tools and actions
 *
 * @see @@@ https://github.com/webgptorg/pipeline#pipeline-collection
 */
export type PipelineCollection = {
    /**
     * Gets all pipelines in the collection
     */
    listPipelines(): Promisable<Array<string_pipeline_url>>;
    /**
     * Gets pipeline by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the collection
     */
    getPipelineByUrl(url: string_pipeline_url): Promisable<PipelineJson>;
    /**
     * Checks whether given prompt was defined in any pipeline in the collection
     */
    isResponsibleForPrompt(prompt: Prompt): Promisable<boolean>;
};
