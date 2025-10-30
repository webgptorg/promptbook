/**
 * Options for the BookTranspiler.
 *
 * @see https://github.com/webgptorg/promptbook/issues/249
 */
export type BookTranspilerOptions = {
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
