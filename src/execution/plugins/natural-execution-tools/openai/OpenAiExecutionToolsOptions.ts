import { string_token } from '../../../../../../../../../utils/typeAliases';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';

/**
 * Options for OpenAiExecutionTools
 */
export interface OpenAiExecutionToolsOptions extends CommonExecutionToolsOptions {
    /**
     * OpenAI API key
     */
    openAiApiKey: string_token;
}
