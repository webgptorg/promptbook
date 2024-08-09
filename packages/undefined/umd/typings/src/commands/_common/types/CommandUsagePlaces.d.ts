import type { TupleToUnion } from 'type-fest';
/**
 * Where the command can be used
 */
export type CommandUsagePlace = TupleToUnion<typeof CommandUsagePlaces>;
/**
 * Where the command can be used
 */
export declare const CommandUsagePlaces: readonly ["PIPELINE_HEAD", "PIPELINE_TEMPLATE"];
