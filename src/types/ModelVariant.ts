import type { TupleToUnion } from 'type-fest';

/**
 * Model variant describes the very general type of the model
 *
 * There are two variants:
 * - **COMPLETION** - model that takes prompt and writes the rest of the text
 * - **CHAT** - model that takes prompt and previous messages and returns response
 */
export type ModelVariant = TupleToUnion<typeof MODEL_VARIANTS>;

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const MODEL_VARIANTS = ['COMPLETION', 'CHAT', 'EMBEDDING' /* <- TODO [🏳] */ /* <- [🤖] */] as const;
