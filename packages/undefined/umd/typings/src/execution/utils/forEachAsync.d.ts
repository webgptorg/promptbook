import type { Promisable } from 'type-fest';
type ForEachAsyncOptions = {
    /**
     * Maximum number of tasks running in parallel
     *
     * @default Infinity
     */
    readonly maxParallelCount?: number;
};
/**
 * Async version of Array.forEach
 *
 * @param array - Array to iterate over
 * @param options - Options for the function
 * @param callbackfunction - Function to call for each item
 * @public exported from `@promptbook/utils`
 */
export declare function forEachAsync<TItem>(array: Array<TItem>, options: ForEachAsyncOptions, callbackfunction: (value: TItem, index: number, array: Array<TItem>) => Promisable<void>): Promise<void>;
export {};
