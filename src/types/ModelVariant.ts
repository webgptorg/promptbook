import type { TupleToUnion } from 'type-fest';

/**
 * Model variant describes the very general type of the model
 *
 * There are these supported model variants:
 * - `COMPLETION` - Model that takes prompt and writes the rest of the text
 * - `CHAT` - Model that takes prompt and previous messages and returns response
 * - `EMBEDDING` - Model that convert text into vector representations
 */
export type ModelVariant = TupleToUnion<typeof MODEL_VARIANTS>;

/**
 * @see {@link ModelVariant}
 * @public exported from `@promptbook/core`
 */
export const MODEL_VARIANTS = ['COMPLETION', 'CHAT', 'IMAGE_GENERATION', 'EMBEDDING' /* <- TODO [🏳] */ /* <- [🤖] */] as const;
