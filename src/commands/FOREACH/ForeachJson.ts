import type { string_parameter_name } from '../../types/typeAliases';
import type { TODO_string } from '../../utils/organization/TODO_string';

/**
 * @@@
 */
export type ForeachJson = {
    /**
     * @@@
     */
    readonly formatName: TODO_string;

    /**
     * @@@
     */
    readonly subformatName: TODO_string;

    /**
     * @@@
     */
    readonly parameterName: string_parameter_name;

    /**
     * @@@
     */
    readonly inputSubparameterNames: Array<string_parameter_name>;
    //                                <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * @@@
     */
    readonly outputSubparameterName: string_parameter_name;
};
