/**
 * @@@
 *
 * @private for `ModelVariant` and `modelCommandParser`
 */
export const MODEL_VARIANTS = ['COMPLETION', 'CHAT', 'EMBEDDING' /* <- TODO [🏳] */ /* <- [🤖] */] as const;

/**
 * Model variant describes the very general type of the model
 *
 * There are two variants:
 * - **COMPLETION** - model that takes prompt and writes the rest of the text
 * - **CHAT** - model that takes prompt and previous messages and returns response
 */

export type ModelVariant = typeof MODEL_VARIANTS[number];
