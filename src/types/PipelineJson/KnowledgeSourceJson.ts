import type { number_id } from '../typeAliases';
import type { string_knowledge_source_content } from '../typeAliases';
import type { string_name } from '../typeAliases';

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
     * @@@
     */
    readonly name: string_name;

    /**
     * @@@
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
