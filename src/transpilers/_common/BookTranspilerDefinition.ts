import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_name, string_title } from '../../types/typeAliases';
import type { Registered } from '../../utils/misc/$Register';
import type { BookTranspiler } from './BookTranspiler';

/**
 * Definition of a book transpiler.
 *
 * @see https://github.com/webgptorg/promptbook/issues/249
 */
export type BookTranspilerDefinition = Registered & {
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
     * The factory function to create a transpiler instance.
     * It can be async.
     *
     * @param tools the execution tools that can be used by the transpiler
     * @returns the transpiler instance
     */
    readonly new: (tools: ExecutionTools) => BookTranspiler | Promise<BookTranspiler>;
};

/**
 * TODO: [🧠] What other information should be in the public profile of the transpiler?
 *      - input format, output format, version, description, icon, etc.
 */
