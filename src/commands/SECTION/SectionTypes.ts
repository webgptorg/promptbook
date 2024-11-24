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
    'PROMPT_TEMPLATE_TASK',
    'SIMPLE_TEMPLATE_TASK',
    'SCRIPT_TEMPLATE_TASK',
    'DIALOG_TEMPLATE_TASK',
    'EXAMPLE',
    'KNOWLEDGE',
    'INSTRUMENT',
    'ACTION',
    // <- [🅱]
] as const;


// TODO: !!!!!! Make alongside TaskType, TaskType and ACRY