import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { Identification } from '../_subtypes/Identification';

/**
 * This is a request from client to server to prepare a pipeline
 *
 * @private internal type of remote server
 */
export type PromptbookServer_PreparePipeline_Request<TCustomOptions> = {
    /**
     * Identifier of the end user or application
     */
    readonly identification: Identification<TCustomOptions>;

    /**
     * The Pipeline to prepare
     */
    readonly pipeline: PipelineJson;
};
