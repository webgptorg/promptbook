import type { string_semantic_version } from '../../types/string_sha256';

/**
 * Parsed BOOK_VERSION command
 *
 * @see ./bookVersionCommandParser.ts for more details
 *
 * @public exported from `@promptbook/editable`
 */
export type BookVersionCommand = {
    readonly type: 'BOOK_VERSION';
    readonly bookVersion: string_semantic_version;
};
