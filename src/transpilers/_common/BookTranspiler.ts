import type { Promisable } from 'type-fest';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_script } from '../../types/string_markdown';
import type { string_name } from '../../types/string_name';
import type { string_title } from '../../types/string_title';
import type { Registered } from '../../utils/misc/$Register';
import type { BookTranspilerOptions } from './BookTranspilerOptions';

/**
 * Transpiler takes a book and transpiles it into another format (e.g., Langchain).
 */
export type BookTranspiler = Registered & {
    /**
     * The name of the transpiler.
     * It is used to identify the transpiler in the register.
     *
     * @example 'python-langchain'
     */
    readonly name: string_name;

    /**
     * The title of the transpiler.
     * It is used to display the transpiler in the UI.
     *
     * @example 'Python Langchain'
     */
    readonly title: string_title;

    /**
     * Transpiles a book.
     *
     * @param book book to transpile
     * @param options additional options for the transpiler
     * @returns transpiled book
     */
    transpileBook(book: string_book, tools: ExecutionTools, options?: BookTranspilerOptions): Promisable<string_script>; // <- TODO: !!! Allow to return multiple files
};
