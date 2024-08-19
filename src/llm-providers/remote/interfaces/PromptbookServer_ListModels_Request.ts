import type { client_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/LlmToolsConfiguration';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export type PromptbookServer_ListModels_Request =
    | PromptbookServer_ListModels_CollectionRequest
    | PromptbookServer_ListModels_AnonymousRequest;

export type PromptbookServer_ListModels_CollectionRequest = {
    /**
     * Collection mode
     */
    isAnonymous: false;

    /**
     * Client responsible for the requests
     */
    readonly clientId: client_id;
};

export type PromptbookServer_ListModels_AnonymousRequest = {
    /**
     * Anonymous mode
     */
    isAnonymous: true;

    /**
     * Configuration for the LLM tools
     */
    readonly llmToolsConfiguration: LlmToolsConfiguration;
};

/**
 * TODO: [👡] DRY `PromptbookServer_Prompt_Request` and `PromptbookServer_ListModels_Request`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🧠][🤺] Pass `clientId` in `PromptbookServer_ListModels_Request`
 * TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
 */
