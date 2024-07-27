import { ModelRequirements } from '../ModelRequirements';
import { string_name, string_persona_description } from '../typeAliases';

/**
 * Defines a persona in the pipeline
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
 * @see https://github.com/webgptorg/promptbook/discussions/22
 */
export type PersonaPreparedJson = PersonaJson & {
    /**
     * Model requirements for the persona
     *
     * Note: The model must be CHAT variant to be usable through persona
     */
    readonly modelRequirements: ModelRequirements & {
        readonly modelVariant: 'CHAT';
    };
};
