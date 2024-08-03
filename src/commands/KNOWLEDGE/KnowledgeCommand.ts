import type { string_file_relative_path, string_knowledge_source } from '../../types/typeAliases';
import type { string_url } from '../../types/typeAliases';

/**
 * Parsed KNOWLEDGE command
 *
 * @see ./knowledgeCommandParser.ts for more details
 * @private within the commands folder
 */
export type KnowledgeCommand = {
    readonly type: 'KNOWLEDGE';
    readonly source: string_knowledge_source;
};
