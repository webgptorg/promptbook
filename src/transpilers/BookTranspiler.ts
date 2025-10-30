import type { BookTranspilerOptions } from './BookTranspilerOptions';

/**
 * Transpiler takes a book and transpiles it into another format.
 *
 * @see https://github.com/webgptorg/promptbook/issues/249
 */
export type BookTranspiler =
    /**
     * Transpiles a book.
     *
     * @param book book to transpile
     * @param options additional options for the transpiler
     * @returns transpiled book
     */
    (book: string, options: BookTranspilerOptions) => Promise<string>;

/**
 * TODO: [🧠] Should there be a BookTranspiler class or just a function?
 *       Maybe a class with a constructor that takes ExecutionTools.
 *       Then the instance would be a function.
 *       @see LlmExecutionTools
 */
