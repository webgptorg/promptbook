import type { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { string_keyword } from '../../utils/normalization/IKeywords';
import type { string_href } from '../typeAliases';
import type { string_markdown } from '../typeAliases';
import type { string_markdown_text } from '../typeAliases';
import type { string_model_name } from '../typeAliases';
import type { string_name } from '../typeAliases';

export type MaterialKnowledgePieceJson = {
    readonly name: string_name;

    readonly title: string_markdown_text;

    readonly content: string_markdown;

    readonly keywords: Array<string_keyword>;

    readonly index: Array<{
        modelName: string_model_name;
        position: EmbeddingVector;
    }>;

    readonly sources: Array<{ title: string_markdown_text; href: string_href }>;
};

/**
 * TODO: !!! Use or uninstall xyzt
 * !!!! Annotate
 * TODO: [🧠][🦪] Maybe allow internal links between (Material)KnowledgePieces withing the KnowledgeJson and maybe require to explicitelly reference the source of the knowledge
 * TODO: [🧠] Make some non-material sources like external search engine or dialog to user
 * TODO: [🧠] Make some non-material (and maybe non-knowledge-like but tool-like) sources like calculator, code interpreter
 */
