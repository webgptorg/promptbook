import { ModelRequirements } from '../ModelRequirements';
import { string_name } from '../typeAliases';

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
     *
     * @example "Skilled copywriter"
     */
    readonly description: string;
};

/**
 * Defines a persona in the pipeline after it has been prepared
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 */
export type PersonaPreparedJson = PersonaJson & {
    /**
     * Model requirements for the persona
     */
    readonly modelRequirements: ModelRequirements & {
        modelVariant: 'CHAT';
    };
};
