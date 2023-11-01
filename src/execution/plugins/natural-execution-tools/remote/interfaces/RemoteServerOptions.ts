import { PromptTemplatePipelineLibrary } from '../../../../../classes/PromptTemplatePipelineLibrary';
import { uuid } from '../../../../../types/typeAliases';
import { CommonExecutionToolsOptions } from '../../../../CommonExecutionToolsOptions';
import { NaturalExecutionTools } from '../../../../NaturalExecutionTools';

export interface RemoteServerOptions extends CommonExecutionToolsOptions {
    /**
     * Port on which the server will listen
     */
    readonly port: number;

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

/**
 * TODO: [👦] Allow to enable/disable streaming and reporting
 */
