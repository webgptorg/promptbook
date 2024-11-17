import type { string_semantic_version } from '../../types/typeAliases';

/**
 * Parsed BOOK_VERSION command
 *
 * @see ./bookVersionCommandParser.ts for more details
 * @private within the commands folder
 */
export type BookVersionCommand = {
    readonly type: 'BOOK_VERSION';
    readonly bookVersion: string_semantic_version;
};
