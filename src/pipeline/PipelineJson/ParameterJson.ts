import type { string_markdown_text } from '../../types/typeAliases';
import type { string_parameter_name } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';

/**
 * Describes one parameter of the pipeline
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ParameterJson = InputParameterJson | IntermediateParameterJson | OutputParameterJson;

/**
 * Describes input parameter of the pipeline
 *
 * 🔴 -> ⚪ -> ⚪
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type InputParameterJson = CommonParameterJson & {
    /**
     * The parameter is input of the pipeline
     */
    readonly isInput: true;

    /**
     * The parameter is NOT output of the pipeline
     */
    readonly isOutput: false;
};

/**
 * Describes intermediate parameter of the pipeline
 *
 * ⚪ -> 🔴 -> ⚪
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type IntermediateParameterJson = CommonParameterJson & {
    /**
     * The parameter is NOT input of the pipeline
     */
    readonly isInput: false;

    /**
     * The parameter is NOT output of the pipeline
     */
    readonly isOutput: false;
};

/**
 * Describes output parameter of the pipeline
 *
 * ⚪ -> ⚪ -> 🔴
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type OutputParameterJson = CommonParameterJson & {
    /**
     * The parameter is NOT input of the pipeline
     */
    readonly isInput: false;

    /**
     * The parameter is output of the pipeline
     */
    readonly isOutput: true;
};

/**
 * Describes commons of one parameter of the pipeline
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type CommonParameterJson = {
    /**
     * Name of the parameter
     * - It must be unique across the pipeline
     * - It should start lowercase and contain letters and numbers
     */
    readonly name: string_parameter_name;

    /**
     * The parameter is input of the pipeline
     */
    readonly isInput: boolean;

    /**
     * The parameter is output of the pipeline
     */
    readonly isOutput: boolean;

    /**
     * Description of the parameter
     * - It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;

    /**
     * Example values of the parameter
     * Note: This values won't be actually used as some default values, but they are just for better understanding of the parameter
     */
    readonly exampleValues?: Array<string_parameter_value>;
    //                       <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems
};

/**
 * TODO: [🧠][🛴][♈] Maybe add type + expectations into the intefrace, like "a person name"
 *       [🛴] @see https://github.com/webgptorg/promptbook/discussions/53
 * TODO: [🧠] Should be here registered subparameters from foreach or not?
 * TODO: [♈] Probably move expectations from tasks to parameters
 * TODO: [🍙] Make some standard order of json properties
 */
