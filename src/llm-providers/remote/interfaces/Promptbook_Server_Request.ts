import type { Prompt } from '../../../types/Prompt';
import type { client_id } from '../../../types/typeAliases';
import { LlmToolsConfiguration } from '../../_common/LlmToolsConfiguration';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export type Promptbook_Server_Request = Promptbook_Server_CollectionRequest | Promptbook_Server_AnonymousRequest;

export type Promptbook_Server_CollectionRequest = {
    /**
     * Client responsible for the requests
     */
    readonly clientId: client_id;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};

export type Promptbook_Server_AnonymousRequest = {
    /**
     * Configuration for the LLM tools
     */
    readonly llmToolsConfiguration: LlmToolsConfiguration;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
};
