import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import { VercelProviderV1 } from './createExecutionToolsFromVercelProvider';

/**
 * Options for `createExecutionToolsFromVercelProvider`
 *
 * @public exported from `@promptbook/google`
 */
export type VercelExecutionToolsOptions = CommonToolsOptions & {
    /**
     * Additional settings for chat models when calling `vercelProvider.chat('model-name', settings)`
     */
    additionalChatSettings?: Partial<Parameters<VercelProviderV1['chat']>[1]>;
};
