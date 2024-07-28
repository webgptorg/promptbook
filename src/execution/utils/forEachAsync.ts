import type { Promisable } from 'type-fest';

type ForEachAsyncOptions = {
    /**
     * Maximum number of tasks running in parallel
     *
     * @default Infinity
     */
    readonly inParallelCount?: number;
};

/**
 * Async version of Array.forEach
 *
 * @param array - Array to iterate over
 * @param options - Options for the function
 * @param callbackfunction - Function to call for each item
 */
export async function forEachAsync<TItem>(
    array: Array<TItem>,
    options: ForEachAsyncOptions,
    callbackfunction: (value: TItem, index: number, array: Array<TItem>) => Promisable<void>,
) {
    const { inParallelCount = Infinity } = options;
    let index = 0;

    let runningTasks: Promisable<void>[] = [];
    const tasks: Promisable<void>[] = [];
    for (const item of array as Array<TItem>) {
        const currentIndex = index++;

        const task = callbackfunction(item, currentIndex, array);
        tasks.push(task);
        runningTasks.push(task);

        /* not await */ Promise.resolve(task).then(() => {
            runningTasks = runningTasks.filter((t) => t !== task);
        });

        if (inParallelCount < runningTasks.length) {
            await Promise.race(runningTasks);
        }
    }
    await Promise.all(tasks);
}
