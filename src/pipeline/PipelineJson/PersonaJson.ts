import type { ChatModelRequirements } from '../../types/ModelRequirements';
import type { number_id } from '../../types/number_id';
import type { string_name } from '../../types/string_name';
import type { string_persona_description } from '../../types/string_persona_description';

/**
 * Defines a persona in the pipeline
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 */
export type PersonaJson = {
    /**
     * Name of the persona
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
     * Models requirements for the persona
     *
     * Sorted by relevance, best-fitting models is first
     *
     * Note: The model must be CHAT variant to be usable through persona
     */
    readonly modelsRequirements: Array<ChatModelRequirements>;

    /**
     * List of preparation ids that were used to prepare this persona
     */
    readonly preparationIds: ReadonlyArray<number_id>;
};

// TODO: [🍙] Make some standard order of json properties
