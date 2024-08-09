import type { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { string_keyword } from '../../utils/normalization/IKeywords';
import type { number_id } from '../typeAliases';
import type { number_linecol_number } from '../typeAliases';
import type { string_markdown } from '../typeAliases';
import type { string_markdown_text } from '../typeAliases';
import type { string_model_name } from '../typeAliases';
import type { string_name } from '../typeAliases';
/**
 * Defines one piece of knowledge in the pipeline
 *
 * Note: Knowledge piece is by definition prepared
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgePiecePreparedJson = {
    /**
     * Unique name of the knowledge piece based on the title
     */
    readonly name?: string_name;
    /**
     * Short title for the information
     */
    readonly title?: string_markdown_text;
    /**
     * The information in markdown format
     */
    readonly content?: string_markdown;
    /**
     * List of sources where the information comes from
     */
    readonly sources: Array<{
        /**
         * Identifier of the source
         */
        readonly name: string_name;
        /**
         * Line number
         */
        readonly line?: number_linecol_number;
        /**
         * Column number
         */
        readonly column?: number_linecol_number;
    }>;
    /**
     * List of keywords that are associated with the knowledge piece
     */
    readonly keywords: Array<string_keyword>;
    /**
     * List of models embeddings that are associated with the knowledge piece
     */
    readonly index: Array<{
        /**
         * Model name which generated the embedding
         */
        readonly modelName: string_model_name;
        /**
         * Embedding vector of the knowledge piece
         */
        readonly position: EmbeddingVector;
    }>;
    /**
     * List of preparation ids that were used to prepare this knowledge piece
     */
    readonly preparationIds: Array<number_id>;
};
/**
 * TODO: [🍙] Make some standart order of json properties
 */
