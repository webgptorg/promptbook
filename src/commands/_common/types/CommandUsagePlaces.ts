import type { TupleToUnion } from 'type-fest';

/**
 * Where the command can be used
 */
export type CommandUsagePlace = TupleToUnion<typeof CommandUsagePlaces>;

/**
 * Where the command can be used
 *
 * @private internal base for `CommandUsagePlace`
 */
export const CommandUsagePlaces = ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'] as const;
