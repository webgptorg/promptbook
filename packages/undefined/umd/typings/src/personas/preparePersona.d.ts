import type { PrepareOptions } from '../prepare/PrepareOptions';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { string_persona_description } from '../types/typeAliases';
/**
 * Prepares the persona for the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 * @public exported from `@promptbook/core`
 */
export declare function preparePersona(personaDescription: string_persona_description, options: PrepareOptions): Promise<PersonaPreparedJson['modelRequirements']>;
/**
 * TODO: [🏢] !! Check validity of `modelName` in pipeline
 * TODO: [🏢] !! Check validity of `systemMessage` in pipeline
 * TODO: [🏢] !! Check validity of `temperature` in pipeline
 */
