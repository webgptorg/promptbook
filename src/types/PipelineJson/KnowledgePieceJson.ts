import type { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { string_keyword } from '../../utils/normalization/IKeywords';
import type {
    string_knowledge_piece_source,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_name,
} from '../typeAliases';

/**
 * Defines one piece of knowledge in the pipeline
 * For example, a piece of information, a fact, a quote, a definition, website, etc.
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgePieceJson = {
    readonly name?: string_name;

    readonly title?: string_markdown_text;

    readonly content?: string_markdown;

    readonly source: string_knowledge_piece_source;
};

/**
 * Defines one piece of knowledge in the pipeline after it has been prepared
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgePiecePreparedJson = {
    readonly name: string_name;

    readonly title: string_markdown_text;

    readonly content: string_markdown;

    readonly keywords: Array<string_keyword>;

    readonly index: Array<{
        readonly modelName: string_model_name;
        readonly position: EmbeddingVector;
    }>;
};

/**
 * TODO: !!!! Annotate
 * TODO: !!! Use or uninstall xyzt
 * TODO: [🧠][🦪] Maybe allow internal links between (Material)KnowledgePieces withing the KnowledgeJson and maybe require to explicitelly reference the source of the knowledge
 * TODO: [🧠] Make some non-material sources like external search engine or dialog to user
 * TODO: [🧠] Make some non-material (and maybe non-knowledge-like but tool-like) sources like calculator, code interpreter
 */
