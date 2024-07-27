import type { EmbeddingVector } from '../../execution/EmbeddingVector';
import type { string_keyword } from '../../utils/normalization/IKeywords';
import type {
    string_href,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_name,
} from '../typeAliases';

/**
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type MaterialKnowledgePieceJson = {
    readonly name: string_name;

    readonly title: string_markdown_text;

    readonly content: string_markdown;

    readonly keywords: Array<string_keyword>;

    readonly index: Array<{
        readonly modelName: string_model_name;
        readonly position: EmbeddingVector;
    }>;

    readonly sources: Array<{ readonly title: string_markdown_text; readonly href: string_href }>;
};

/**
 * TODO: !!!! Link everything in PipelineJson folder to discussions
 * TODO: !!!! Split prepared and unprepared knowledge
 * TODO: !!! Use or uninstall xyzt
 * !!!! Annotate
 * TODO: [🧠][🦪] Maybe allow internal links between (Material)KnowledgePieces withing the KnowledgeJson and maybe require to explicitelly reference the source of the knowledge
 * TODO: [🧠] Make some non-material sources like external search engine or dialog to user
 * TODO: [🧠] Make some non-material (and maybe non-knowledge-like but tool-like) sources like calculator, code interpreter
 */
