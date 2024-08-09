import type { string_semantic_version } from '../../types/typeAliases';
/**
 * Parsed PROMPTBOOK_VERSION command
 *
 * @see ./promptbookVersionCommandParser.ts for more details
 * @private within the commands folder
 */
export type PromptbookVersionCommand = {
    readonly type: 'PROMPTBOOK_VERSION';
    readonly promptbookVersion: string_semantic_version;
};
