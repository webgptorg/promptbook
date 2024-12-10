import type { AvailableModel } from '../../execution/AvailableModel';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { VercelProvider } from './VercelProvider';

/**
 * Options for `createExecutionToolsFromVercelProvider`
 *
 * @public exported from `@promptbook/google`
 */
export type VercelExecutionToolsOptions = CommonToolsOptions &
    Pick<LlmExecutionTools, 'title' | 'description'> & {
        /**
         * Vercel provider for the execution tools
         */
        readonly vercelProvider: VercelProvider;

        /**
         * List of available models for given Vercel provider
         */
        readonly availableModels: ReadonlyArray<AvailableModel>;
        // ^^^^
        // TODO: This is stupid, because good design would be to have list of models as a part of the Vercel provider itself
        //       and not to pass it as a separate parameter

        /**
         * Additional settings for chat models when calling `vercelProvider.chat('model-name', settings)`
         */
        readonly additionalChatSettings?: Partial<Parameters<VercelProvider['chat']>[1]>;
    };
