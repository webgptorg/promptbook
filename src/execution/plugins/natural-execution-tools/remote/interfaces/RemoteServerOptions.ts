import { PromptTemplatePipelineLibrary } from '../../../../../classes/PromptTemplatePipelineLibrary';
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
     * THis is used to checkl validity of the prompt to prevent DDoS
     */
    readonly ptpLibrary: PromptTemplatePipelineLibrary;

    /**
     * Natural execution tools to use
     *
     * Note: Theese tools will be wrapped in a logger for each client to log all requests
     */
    readonly naturalExecutionTools: NaturalExecutionTools;
}
