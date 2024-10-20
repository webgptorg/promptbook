import type { AvailableModel } from '../../../execution/AvailableModel';

/**
 * Socket.io error for remote text generation
 *
 * This is sent from server to client when models are listed
 */
export interface PromptbookServer_ListModels_Response {
    /**
     * Available models that can be used
     */
    readonly models: Array<AvailableModel>;
}

/**
 * TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
 */
