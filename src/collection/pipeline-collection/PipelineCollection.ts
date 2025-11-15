import type { Promisable } from 'type-fest';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { Prompt } from '../../types/Prompt';
import type { string_pipeline_url } from '../../types/typeAliases';

/**
 * Collection that groups together pipelines, knowledge, personas, tools and actions
 *
 * Note: [🧸] There are two types of collections:
 * - `AgentCollection` - which groups together AI Agents
 * - `PipelineCollection` - which groups together *(deprecated)* pipelines
 */
export type PipelineCollection = {
    /**
     * Gets all pipelines in the collection
     */
    listPipelines(): Promisable<ReadonlyArray<string_pipeline_url>>;
    // <- TODO: [🧠][👩🏾‍🤝‍🧑🏿] List `inputParameters` required for the execution

    /**
     * Gets pipeline by its URL
     *
     * Note: This is not a direct fetching from the URL, but a lookup in the collection
     */
    getPipelineByUrl(url: string_pipeline_url): Promisable<PipelineJson>;

    /**
     * Checks whether given prompt was defined in any pipeline in the collection
     *
     * @deprecated Make better mechanism for skimming the remote server
     */
    isResponsibleForPrompt(prompt: Prompt): Promisable<boolean>;
};
