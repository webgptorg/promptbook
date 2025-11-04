import { $Register } from '../../../utils/misc/$Register';
import { BookTranspiler } from '../BookTranspiler';

/**
 * Register for book transpilers.
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but there can be more instances across different builds or environments.
 * @see https://github.com/webgptorg/promptbook/issues/249
 *
 * @public exported from `@promptbook/core`
 */
export const $bookTranspilersRegister = new $Register<BookTranspiler>('book_transpilers');

/**
 * TODO: [®] DRY Register logic
 */
