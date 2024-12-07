import type { createOpenAI } from '@ai-sdk/openai';
// <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type
import { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { keepUnused } from '../../utils/organization/keepUnused';

type ProviderV1 = ReturnType<typeof createOpenAI>;
// <- TODO: Is there some way to get the type of the provider directly, NOT this stupid way via inferring the return type from a specific vercel provider⁉

/**
 * !!!!!!
 *
 * @public exported from `@promptbook/vercel`
 */
export function createExecutionToolsFromVercelProvider(vercelProvider: ProviderV1): LlmExecutionTools {
    keepUnused(vercelProvider);

    return {
        title: '!!!',
        description: `!!! (through Vercel)`,
        checkConfiguration() {
            // TODO: !!!!!!
            return Promise.resolve();
        },
        async listModels() {
            return [
                /* TODO: !!!!! */
            ];
        },
    };
}
