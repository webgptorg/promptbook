/**
 * Semantic helper
 *
 * For example `"gpt-4"`
 *
 * @private internal utility of `string_model_name.ts`
 */
export type string_model_name_private =
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-16k-0613'
    | string /* <- TODO: Import from 'openai' package */;
