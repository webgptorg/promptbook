/**
 * @@@
 *
 * @private for `ModelVariant` and `modelCommandParser`
 */
export declare const MODEL_VARIANTS: readonly ["COMPLETION", "CHAT", "EMBEDDING"];
/**
 * Model variant describes the very general type of the model
 *
 * There are two variants:
 * - **COMPLETION** - model that takes prompt and writes the rest of the text
 * - **CHAT** - model that takes prompt and previous messages and returns response
 */
export type ModelVariant = typeof MODEL_VARIANTS[number];
