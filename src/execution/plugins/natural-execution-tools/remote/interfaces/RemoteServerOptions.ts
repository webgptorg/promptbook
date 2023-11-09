import { PromptTemplatePipelineLibrary } from '../../../../../classes/PromptTemplatePipelineLibrary';
import { string_uri, uuid } from '../../../../../types/typeAliases';
import { CommonExecutionToolsOptions } from '../../../../CommonExecutionToolsOptions';
import { NaturalExecutionTools } from '../../../../NaturalExecutionTools';

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
    createNaturalExecutionTools(clientId: uuid): NaturalExecutionTools /* <- TODO: &({}|IDestroyable) */;
}
