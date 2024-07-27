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
