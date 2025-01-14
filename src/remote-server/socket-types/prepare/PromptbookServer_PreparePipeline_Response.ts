import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';

/**
 * This is sent from server to client when the pipeline is prepared
 *
 * @private internal type of remote server
 */
export type PromptbookServer_PreparePipeline_Response = {
    /**
     * Prepared pipeline
     */
    readonly preparedPipeline: PipelineJson;
};
