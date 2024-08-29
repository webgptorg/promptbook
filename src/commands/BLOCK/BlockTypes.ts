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
export const BlockTypes = [
    'PROMPT_TEMPLATE',
    'SIMPLE_TEMPLATE',
    'SCRIPT_TEMPLATE',
    'DIALOG_TEMPLATE',
    'SAMPLE',
    'KNOWLEDGE',
    'INSTRUMENT',
    'ACTION',
    // <- [🅱]
] as const;
