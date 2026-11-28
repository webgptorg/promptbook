import type { string_url_private } from './string_url_private';

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book"`
 *
 * @private internal utility of `string_pipeline_url.ts`
 */
export type string_pipeline_url_private = string_url_private;

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book#keywords"`
 *
 * @private internal utility of `string_pipeline_url.ts`
 */
export type string_pipeline_url_with_task_hash_private = string_pipeline_url_private;
