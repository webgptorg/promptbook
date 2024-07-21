import type { TupleToUnion } from 'type-fest';

/**
 * Where the command can be used
 */
export type CommandUsagePlace = TupleToUnion<typeof CommandUsagePlaces>;

/**
 * Where the command can be used
 */
export const CommandUsagePlaces = ['PIPELINE_HEAD' ,'PIPELINE_TEMPLATE'] as const;
