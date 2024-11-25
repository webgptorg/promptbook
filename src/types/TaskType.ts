import type { TupleToUnion } from 'type-fest';

/**
 * Type of the task
 */
export type TaskType = TupleToUnion<typeof TaskTypes>;

/**
 * All available task types
 *
 * There is is distinction between task types and section types
 * - Every section in markdown has its SectionType
 * - Some sections are tasks but other can be non-task sections
 *
 * @public exported from `@promptbook/core`
 */
export const TaskTypes = [
    'PROMPT',
    'SIMPLE',
    'SCRIPT',
    'DIALOG',
    // <- [🅱]
] as const;
