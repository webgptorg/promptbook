import type { string_knowledge_source_content } from "../../types/typeAliases";

/**
 * Parsed KNOWLEDGE command
 *
 * @see ./knowledgeCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type KnowledgeCommand = {
	readonly type: "KNOWLEDGE";
	readonly knowledgeSourceContent: string_knowledge_source_content;
};
