import type { number_id, string_knowledge_source_content, string_name } from '../typeAliases';

/**
 * Defines one source of knowledge in the pipeline
 * For example, a source of information, a fact, a quote, a definition, website, etc.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgeSourceJson = {
    /**
     * Unique identifier of the knowledge source
     */
    readonly name: string_name;

    /**
     * Source of one knowledge
     *
     * It can be a link, a relative path to file or direct text or combination of those
     *
     * For example `"https://pavolhejny.com/"`
     * For example `"./pavol-hejny-cv.pdf"`
     * For example `"Pavol Hejný has web https://pavolhejny.com/"`
     * For example `"Pavol Hejný is web developer and creator of Promptbook and Collboard"`
     */
    readonly sourceContent: string_knowledge_source_content;
};

/**
 * Defines one source of knowledge in the pipeline after it has been prepared
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgeSourcePreparedJson = KnowledgeSourceJson & {
    /**
     * List of preparation ids that were used to prepare this knowledge source to knowledge pieces
     */
    readonly preparationIds: Array<number_id>;
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
