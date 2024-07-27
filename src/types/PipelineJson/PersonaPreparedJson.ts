import { ModelRequirements } from '../ModelRequirements';
import { PersonaJson } from './PersonaJson';

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
