import type { ClientOptions } from 'openai';
import type { string_token } from '../../types/typeAliases';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';
import type { OpenAiVectorStoreOptions } from './OpenAiVectorStoreOptions';

/**
 * Options for `createOpenAiAgentKitExecutionTools` and `OpenAiAgentKitExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAgentKitExecutionToolsOptions = OpenAiCompatibleExecutionToolsOptions &
    ClientOptions &
    OpenAiVectorStoreOptions & {
        /**
         * Whether creating new AgentKit agents is allowed.
         *
         * @default false
         */
        readonly isCreatingNewAgentsAllowed: boolean;

        /**
         * Identifier for the agent configuration to use.
         */
        readonly agentId: string_token;
    };
