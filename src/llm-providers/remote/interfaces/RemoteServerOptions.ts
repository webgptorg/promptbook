import type { CommonExecutionToolsOptions } from '../../../execution/CommonExecutionToolsOptions';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { PromptbookLibrary } from '../../../library/PromptbookLibrary';
import type { client_id } from '../../../types/typeAliases';
import type { string_uri } from '../../../types/typeAliases';

export type RemoteServerOptions = CommonExecutionToolsOptions & {
    /**
     * Port on which the server will listen
     */
    readonly port: number;

    /**
     * Path for the Socket.io server to listen
     *
     * @default '/socket.io'
     * @example '/promptbook/socket.io'
     */
    readonly path: string_uri;

    /**
     * Promptbook library to use
     *
     * This is used to checkl validity of the prompt to prevent DDoS
     */
    readonly library: PromptbookLibrary;

    /**
     * Creates llm execution tools for each client
     */
    createLlmExecutionTools(clientId: client_id): LlmExecutionTools /* <- TODO: &({}|IDestroyable) */;
};
