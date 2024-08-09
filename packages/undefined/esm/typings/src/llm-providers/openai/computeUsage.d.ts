/**
 * String value found on OpenAI and Anthropic Claude page
 *
 * @see https://openai.com/api/pricing/
 * @see https://docs.anthropic.com/en/docs/models-overview
 *
 * @private within the repository, used only as internal helper for `OPENAI_MODELS` and `computeUsage`
 */
type string_model_price = `$${number}.${number} / ${number}M tokens`;
/**
 * Function computeUsage will create price per one token based on the string value found on openai page
 *
 * @private within the repository, used only as internal helper for `OPENAI_MODELS`
 */
export declare function computeUsage(value: string_model_price): number;
export {};
