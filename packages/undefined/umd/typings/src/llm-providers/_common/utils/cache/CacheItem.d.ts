import type { PromptResult } from '../../../../execution/PromptResult';
import type { Prompt } from '../../../../types/Prompt';
import type { string_date_iso8601 } from '../../../../types/typeAliases';
import type { string_promptbook_version } from '../../../../version';
/**
 * @@@
 */
export type CacheItem = {
    /**
     * @@@
     */
    date: string_date_iso8601;
    /**
     * @@@
     */
    promptbookVersion: string_promptbook_version;
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
