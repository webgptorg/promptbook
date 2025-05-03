import type { string_parameter_name } from '../../types/typeAliases';
import type { TODO_string } from '../../utils/organization/TODO_string';

/**
 * Information for the FOREACH command, describing how to iterate over a parameter's subvalues in a pipeline task.
 */
export type ForeachJson = {
    /**
     * The name of the format to use for parsing the parameter (e.g., 'CSV').
     */
    readonly formatName: TODO_string;

    /**
     * The name of the subformat to use (e.g., CSV Rows).
     */
    readonly subformatName: TODO_string;

    /**
     * The name of the parameter to iterate over.
     */
    readonly parameterName: string_parameter_name;

    /**
     * The names of the subparameters (e.g., name of the CSV rows)
     */
    readonly inputSubparameterNames: Array<string_parameter_name>;
    //                                <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * The name of the subparameters (e.g., name of the CSV rows)
     */
    readonly outputSubparameterName: string_parameter_name;
};
