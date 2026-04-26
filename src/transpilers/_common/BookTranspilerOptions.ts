import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';

/**
 * Options for the BookTranspiler.
 */
export type BookTranspilerOptions = Omit<CommonToolsOptions, 'maxRequestsPerMinute'> & {
    /**
     * If true, the transpiler will log verbose information to the console.
     *
     * @default false
     */
    readonly isVerbose?: boolean;

    /**
     * If true, the transpiler will include comments in the output.
     *
     * @default true
     */
    readonly shouldIncludeComments?: boolean;

    /**
     * TODO: [🧠] What other options should be here?
     */
};
