import type { string_knowledge_source_content } from '../../types/typeAliases';

/**
 * Parsed KNOWLEDGE command
 *
 * @see ./knowledgeCommandParser.ts for more details
 * @private within the commands folder
 */
export type KnowledgeCommand = {
    readonly type: 'KNOWLEDGE';
    readonly sourceContent: string_knowledge_source_content;
};
