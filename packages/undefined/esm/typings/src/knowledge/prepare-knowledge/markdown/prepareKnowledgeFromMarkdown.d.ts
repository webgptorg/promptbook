import type { PrepareOptions } from '../../../prepare/PrepareOptions';
import type { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { string_markdown } from '../../../types/typeAliases';
/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export declare function prepareKnowledgeFromMarkdown(knowledgeContent: string_markdown, options: PrepareOptions): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>>>;
/**
 * TODO: [🐝][🔼] !!! Export via `@promptbook/markdown`
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
