import type { ChatModelRequirements } from '../ModelRequirements';
import type { number_id, string_name, string_persona_description } from '../typeAliases';

/**
 * Defines a persona in the pipeline
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 */
export type PersonaJson = {
    /**
     * Name of the template
     * - It must be unique across the pipeline
     * - It should start uppercase and can contain letters and numbers
     */
    readonly name: string_name;

    /**
     * Description of persona
     */
    readonly description: string_persona_description;
};

/**
 * Defines a persona in the pipeline after it has been prepared
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 */
export type PersonaPreparedJson = PersonaJson & {
    /**
     * Model requirements for the persona
     *
     * Note: The model must be CHAT variant to be usable through persona
     */
    readonly modelRequirements: ChatModelRequirements;

    /**
     * List of preparation ids that were used to prepare this persona
     */
    readonly preparationIds: Array<number_id>;
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
