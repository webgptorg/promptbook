import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { OpenAiAgentKitExecutionTools } from './OpenAiAgentKitExecutionTools';
import type { OpenAiAgentKitExecutionToolsOptions } from './OpenAiAgentKitExecutionToolsOptions';

/**
 * Factory for OpenAI AgentKit execution tools.
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiAgentKitExecutionTools = Object.assign(
    (options: OpenAiAgentKitExecutionToolsOptions): OpenAiAgentKitExecutionTools => {
        if (options.isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented in createOpenAiAgentKitExecutionTools`);
        }

        return new OpenAiAgentKitExecutionTools(options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiAgentKitExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
