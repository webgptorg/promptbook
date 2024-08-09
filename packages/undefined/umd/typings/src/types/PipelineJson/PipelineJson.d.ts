import type { string_file_path } from '../typeAliases';
import type { string_markdown_text } from '../typeAliases';
import type { string_pipeline_url } from '../typeAliases';
import type { string_semantic_version } from '../typeAliases';
import type { KnowledgePiecePreparedJson } from './KnowledgePieceJson';
import type { KnowledgeSourceJson } from './KnowledgeSourceJson';
import type { KnowledgeSourcePreparedJson } from './KnowledgeSourceJson';
import type { PersonaJson } from './PersonaJson';
import type { PersonaPreparedJson } from './PersonaJson';
import type { PreparationJson } from './PreparationJson';
import type { PromptTemplateJson } from './PromptTemplateJson';
import type { PromptTemplateParameterJson } from './PromptTemplateParameterJson';
/**
 * Promptbook is the **core concept of this package**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see @@@ https://github.com/webgptorg/promptbook#promptbook
 */
export type PipelineJson = {
    /**
     * Unique identifier of the pipeline
     *
     * Note: It must be unique across all pipeline collections
     * Note: It must use HTTPs URL
     * Tip: You can do versioning in the URL
     *      For example: https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md@1.0.0
     * Warning: Do not hash part of the URL, hash part is used for identification of the prompt template in the pipeline
     */
    readonly pipelineUrl?: string_pipeline_url;
    /**
     * Internal helper for tracking the source `.ptbk.md` file of the pipeline
     */
    readonly sourceFile?: string_file_path;
    /**
     * Title of the promptbook
     * -It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string_markdown_text;
    /**
     * Version of the .ptbk.json file
     */
    readonly promptbookVersion: string_semantic_version;
    /**
     * Description of the promptbook
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;
    /**
     * Set of variables that are used across the pipeline
     */
    readonly parameters: Array<PromptTemplateParameterJson>;
    /**
     * Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplates: Array<PromptTemplateJson>;
    /**
     * Set of information that are used as external knowledge in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/41
     */
    readonly knowledgeSources: Array<KnowledgeSourceJson | KnowledgeSourcePreparedJson>;
    /**
     * Set of information that are used as external knowledge in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/41
     */
    readonly knowledgePieces: Array<KnowledgePiecePreparedJson>;
    /**
     * List of prepared virtual personas that are used in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/22
     */
    readonly personas: Array<PersonaJson | PersonaPreparedJson>;
    /**
     * List of prepared virtual personas that are used in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/78
     */
    readonly preparations: Array<PreparationJson>;
};
/**
 * TODO: [🍙] Make some standart order of json properties
 * TODO: [🧠] Maybe wrap all {parameterNames} in brackets for example { "resultingParameterName": "{foo}" }
 * Note: [💼] There was a proposal for multiple types of promptbook objects 78816ff33e2705ee1a187aa2eb8affd976d4ea1a
 *       But then immediately reverted back to the single type
 *       With knowledge as part of the promptbook and collection just as a collection of promptbooks
 */
