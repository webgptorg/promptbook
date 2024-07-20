import type { string_file_relative_path } from '../../types/typeAliases';
import type { string_url } from '../../types/typeAliases';

/**
 * Parsed KNOWLEDGE command
 *
 * @see ./knowledgeCommandParser.ts for more details
 * @private within the commands folder
 */
export type KnowledgeCommand = {
    readonly type: 'KNOWLEDGE';
    readonly source: string_url | string_file_relative_path;
};
