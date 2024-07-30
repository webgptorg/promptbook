import type { PromptResult } from '../../../execution/PromptResult';
import type { Prompt } from '../../../types/Prompt';

/**
 * @@@
 */
export type CacheItem = {
    /**
     * @@@
     */
    prompt: Prompt;

    /**
     * @@@
     */
    promptResult: PromptResult;
};

/**
 * TODO: [🧠] Should be this exported alongsite `cacheLlmTools` through `@promptbook/utils` OR through `@promptbook/types`
 * TODO: [🛫] `prompt` is NOT fully serializable as JSON, it contains functions which are not serializable, fix it
 */
