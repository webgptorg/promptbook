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
         * Additional settings for chat models, for example `temperature` or `providerOptions`
         *
         * Note: Since Vercel AI SDK v5 these settings belong to the model call, not to
         *       `vercelProvider.chat('model-name')` which takes just the model name
         */
        readonly additionalChatSettings?: Partial<
            Omit<Parameters<ReturnType<VercelProvider['chat']>['doGenerate']>[0], 'prompt'>
        >;
    };
