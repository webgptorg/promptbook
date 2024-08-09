import type { PipelineCollection } from '../../../collection/PipelineCollection';
import type { CommonExecutionToolsOptions } from '../../../execution/CommonExecutionToolsOptions';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { client_id, string_uri } from '../../../types/typeAliases';
/**
 * @@@
 *
 * @public exported from `@promptbook/remote-client`
 * @public exported from `@promptbook/remote-server`
 */
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
     * Promptbook collection to use
     *
     * This is used to check validity of the prompt to prevent DDoS
     */
    readonly collection: PipelineCollection;
    /**
     * Creates llm execution tools for each client
     */
    createLlmExecutionTools(clientId: client_id): LlmExecutionTools;
};
/**
 * TODO: [🍜] Add anonymous option
 */
