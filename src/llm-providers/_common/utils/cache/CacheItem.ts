import type { PromptResult } from '../../../../execution/PromptResult';
import type { Prompt } from '../../../../types/Prompt';
import type { string_date_iso8601, string_semantic_version } from '../../../../types/typeAliases';
import type { string_promptbook_version } from '../../../../version';

/**
 * Represents a single item stored in the LLM cache.
 */
export type CacheItem = {
    /**
     * The date and time when the cache item was created, in ISO 8601 format.
     */
    date: string_date_iso8601;

    /**
     * The version of the Promptbook library used when this cache item was created.
     */
    promptbookVersion?: string_promptbook_version;

    /**
     * The version of the Book language used when this cache item was created.
     */
    bookVersion?: string_semantic_version;

    /**
     * The prompt that was sent to the LLM.
     */
    prompt: Prompt;

    /**
     * The response received from the LLM.
     */
    promptResult: PromptResult;
};

/**
 * TODO: [🧠] Should be this exported alongsite `cacheLlmTools` through `@promptbook/utils` OR through `@promptbook/types`
 */
