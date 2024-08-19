import type { Prompt } from '../../../types/Prompt';
import type { client_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/LlmToolsConfiguration';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export type PromptbookServer_Prompt_Request =
    | PromptbookServer_Prompt_CollectionRequest
    | PromptbookServer_Prompt_AnonymousRequest;

export type PromptbookServer_Prompt_CollectionRequest = {
    /**
     * Collection mode
     */
    isAnonymous: false;

    /**
     * Client responsible for the requests
     */
    readonly clientId: client_id;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};

export type PromptbookServer_Prompt_AnonymousRequest = {
    /**
     * Anonymous mode
     */
    isAnonymous: true;

    /**
     * Configuration for the LLM tools
     */
    readonly llmToolsConfiguration: LlmToolsConfiguration;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};


/**
 * TODO: [👡] DRY `PromptbookServer_Prompt_Request` and `PromptbookServer_ListModels_Request`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 */