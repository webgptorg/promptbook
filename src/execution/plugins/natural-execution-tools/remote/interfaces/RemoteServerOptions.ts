import type { PromptTemplatePipelineLibrary } from '../../../../../classes/PromptTemplatePipelineLibrary';
import type { client_id, string_uri } from '../../../../../types/typeAliases';
import type { CommonExecutionToolsOptions } from '../../../../CommonExecutionToolsOptions';
import type { NaturalExecutionTools } from '../../../../NaturalExecutionTools';

export interface RemoteServerOptions extends CommonExecutionToolsOptions {
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
     * Prompt template pipeline library to use
     *
     * This is used to checkl validity of the prompt to prevent DDoS
     */
    readonly ptbkLibrary: PromptTemplatePipelineLibrary;

    /**
     * Creates natural execution tools for each client
     */
    createNaturalExecutionTools(clientId: client_id): NaturalExecutionTools /* <- TODO: &({}|IDestroyable) */;
}

/**
 * TODO: [👦] Allow to enable/disable streaming and reporting
 */
