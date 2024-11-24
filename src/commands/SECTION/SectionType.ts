import type { TupleToUnion } from 'type-fest';

/**
 * Section type describes the way how the section is sectiond
 *
 * @public exported from `@promptbook/core`
 */
export type SectionType = TupleToUnion<typeof SectionTypes>;

/**
 * Section type describes the way how the section is sectiond
 *
 * @public exported from `@promptbook/core`
 */
export const SectionTypes = [
    'PROMPT_SECTION_TASK',
    'SIMPLE_SECTION_TASK',
    'SCRIPT_SECTION_TASK',
    'DIALOG_SECTION_TASK',
    'EXAMPLE',
    'KNOWLEDGE',
    'INSTRUMENT',
    'ACTION',
    // <- [🅱]
] as const;


// <- TODO: !!!!!! Make alongside `SectionType` the `TaskType`, `TaskType` and ACRY