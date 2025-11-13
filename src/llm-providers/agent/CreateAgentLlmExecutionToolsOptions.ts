import type { string_book } from '../../_packages/types.index';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
// <- TODO: !!! Keep imported only the type of OpenAiAssistantExecutionTools

/**
 * Options for creating AgentLlmExecutionTools
 */

export type CreateAgentLlmExecutionToolsOptions = {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools | OpenAiAssistantExecutionTools;
    // <- TODO: !!!! Full execution tools here

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;
    // <- TODO: !!!! Updatable = BehaviorSubject<T>|T here with JSDoc how it works
};



/*


Agent shouldnt be just AgentLlmExecutionTools



public getLlmExecutionTools: (options: CreateAgentLlmExecutionToolsOptions) {
    new AgentLlmExecutionTools(options),
}



AgentOptions =  {...


executionTools
common isVerbose


CreateAgentLlmExecutionToolsOptions =  {...







 */

