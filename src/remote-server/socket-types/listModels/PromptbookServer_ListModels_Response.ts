import type { AvailableModel } from '../../../execution/AvailableModel';

/**
 * Models available for use in the server
 *
 * This is sent from server to client when models are listed
 *
 * @private internal type of remote server
 */
export type PromptbookServer_ListModels_Response = {
    /**
     * Available models that can be used
     */
    readonly models: ReadonlyArray<AvailableModel>;
};

/**
 * TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
 */
