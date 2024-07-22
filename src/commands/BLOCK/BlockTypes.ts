import type { TupleToUnion } from 'type-fest';

/**
 * Block type describes the way how the block is blockd
 *
 * @see https://github.com/webgptorg/promptbook#block-type
 */
export type BlockType = TupleToUnion<typeof BlockTypes>;

/**
 * Block type describes the way how the block is blockd
 *
 * @see https://github.com/webgptorg/promptbook#block-type
 */
export const BlockTypes = [
    'PROMPT_TEMPLATE',
    'SIMPLE_TEMPLATE',
    'SCRIPT',
    'PROMPT_DIALOG',
    'SAMPLE',
    'KNOWLEDGE',
    'INSTRUMENT',
    'ACTION',
] as const;
