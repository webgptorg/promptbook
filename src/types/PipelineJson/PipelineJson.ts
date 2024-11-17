import type { ModelRequirements } from '../ModelRequirements';
import type {
    string_filename,
    string_markdown_text,
    string_pipeline_url,
    string_semantic_version,
} from '../typeAliases';
import type { KnowledgePiecePreparedJson } from './KnowledgePieceJson';
import type { KnowledgeSourceJson, KnowledgeSourcePreparedJson } from './KnowledgeSourceJson';
import type { ParameterJson } from './ParameterJson';
import type { PersonaJson, PersonaPreparedJson } from './PersonaJson';
import type { PreparationJson } from './PreparationJson';
import type { TemplateJson } from './TemplateJson';

/**
 * Promptbook is the **core concept of this package**.
 * It represents a series of templates chained together to form a pipeline / one big template with input and result parameters.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see @@@ https://github.com/webgptorg/promptbook#promptbook
 */
export type PipelineJson = {
    /*
    TODO: [💼]
    > readonly type: 'PIPELINE';

    + make type test for this
    */

    /**
     * Unique identifier of the pipeline
     *
     * Note: It must be unique across all pipeline collections
     * Note: It must use HTTPs URL
     * Tip: You can do versioning in the URL
     *      For example: https://promptbook.studio/webgpt/write-website-content-cs.book.md@1.0.0
     * Warning: Do not hash part of the URL, hash part is used for identification of the template in the pipeline
     */
    readonly pipelineUrl?: string_pipeline_url;

    /**
     * Internal helper for tracking the source `.book.md` file of the pipeline
     */
    readonly sourceFile?: string_filename;

    /**
     * Title of the promptbook
     * -It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string_markdown_text;

    /**
     * Version of the Book language
     *
     * @see https://github.com/webgptorg/book
     */
    readonly bookVersion?: string_semantic_version;

    /**
     * Description of the promptbook
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;

    /**
     * Set of variables that are used across the pipeline
     */
    readonly parameters: Array<ParameterJson>;
    //                    <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * Default model requirements for the model for all `templates`
     */
    readonly defaultModelRequirements?: Partial<ModelRequirements>;

    /**
     * Sequence of templates that are chained together to form a pipeline
     */
    readonly templates: Array<TemplateJson>;
    //                   <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * Set of information that are used as external knowledge in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/41
     */
    readonly knowledgeSources: Array<KnowledgeSourceJson | KnowledgeSourcePreparedJson>;
    //                          <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * Set of information that are used as external knowledge in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/41
     */
    readonly knowledgePieces: Array<KnowledgePiecePreparedJson>;
    //                         <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * List of prepared virtual personas that are used in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/22
     */
    readonly personas: Array<PersonaJson | PersonaPreparedJson>;
    //                  <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * List of prepared virtual personas that are used in the pipeline
     *
     * @see https://github.com/webgptorg/promptbook/discussions/78
     */
    readonly preparations: Array<PreparationJson>;
    //                      <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems
};

/**
 * TODO: [🛳] Default PERSONA for the pipeline `defaultPersonaName` (same as `defaultModelRequirements`)
 * TODO: [🍙] Make some standard order of json properties
 * TODO: [🧠] Maybe wrap all {parameterNames} in brackets for example { "resultingParameterName": "{foo}" }
 * Note: [💼] There was a proposal for multiple types of promptbook objects 78816ff33e2705ee1a187aa2eb8affd976d4ea1a
 *       But then immediately reverted back to the single type
 *       With knowledge as part of the promptbook and collection just as a collection of promptbooks
 */
