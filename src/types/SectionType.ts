import type { TupleToUnion } from 'type-fest';
import { TaskTypes } from './TaskType';

/**
 * Type of the section
 *
 * @public exported from `@promptbook/types`
 */
export type SectionType = TupleToUnion<typeof SectionTypes>;

/**
 * All available sections which are not tasks
 *
 * @public exported from `@promptbook/core`
 */
export const NonTaskSectionTypes = ['EXAMPLE', 'KNOWLEDGE', 'INSTRUMENT', 'ACTION'] as const;

/**
 * All available section types
 *
 * There is is distinction between task types and section types
 * - Every section in markdown has its SectionType
 * - Some sections are tasks but other can be non-task sections
 *
 * @public exported from `@promptbook/core`
 */
export const SectionTypes = [
    ...TaskTypes.map((TaskType) => `${TaskType}_TASK` as const),
    ...NonTaskSectionTypes,
] as const;
