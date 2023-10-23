import { uuid } from '../../../../../../../../../utils/typeAliases';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { NaturalExecutionTools } from '../../../NaturalExecutionTools';

/**
 * Options for SupabaseLoggerWrapperOfNaturalExecutionTools
 */
export interface SupabaseLoggerWrapperOfNaturalExecutionToolsOptions extends CommonExecutionToolsOptions {
    /**
     * Execution tools to use
     * Theese tools will be wrapped in a logger for each client to log all requests
     */
    readonly naturalExecutionTools: NaturalExecutionTools;

    /**
     * Client responsible for the requests
     */
    readonly clientId: uuid;
}
