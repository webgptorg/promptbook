import type { TupleToUnion } from 'type-fest';

/**
 * Template type describes the way how the template is templated
 *
 * @see https://github.com/webgptorg/promptbook#template-type
 * @public exported from `@promptbook/core`
 */
export type SectionType = TupleToUnion<typeof SectionTypes>;

/**
 * Template type describes the way how the template is templated
 *
 * @see https://github.com/webgptorg/promptbook#template-type
 * @public exported from `@promptbook/core`
 */
export const SectionTypes = [
    'PROMPT_TEMPLATE',
    'SIMPLE_TEMPLATE',
    'SCRIPT_TEMPLATE',
    'DIALOG_TEMPLATE',
    'EXAMPLE',
    'KNOWLEDGE',
    'INSTRUMENT',
    'ACTION',
    // <- [🅱]
] as const;
