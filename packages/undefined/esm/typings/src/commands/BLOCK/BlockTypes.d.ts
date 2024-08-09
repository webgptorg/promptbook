import type { TupleToUnion } from 'type-fest';
/**
 * Block type describes the way how the block is blockd
 *
 * @see https://github.com/webgptorg/promptbook#block-type
 * @public exported from `@promptbook/core`
 */
export type BlockType = TupleToUnion<typeof BlockTypes>;
/**
 * Block type describes the way how the block is blockd
 *
 * @see https://github.com/webgptorg/promptbook#block-type
 * @public exported from `@promptbook/core`
 */
export declare const BlockTypes: readonly ["PROMPT_TEMPLATE", "SIMPLE_TEMPLATE", "SCRIPT", "PROMPT_DIALOG", "SAMPLE", "KNOWLEDGE", "INSTRUMENT", "ACTION"];
