import type { string_pipeline_url_private, string_pipeline_url_with_task_hash_private } from './string_pipeline_url_private';

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book"`
 */
export type string_pipeline_url = string_pipeline_url_private; // <- TODO: `${string}.book`

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book#keywords"`
 */
export type string_pipeline_url_with_task_hash = string_pipeline_url_with_task_hash_private;
