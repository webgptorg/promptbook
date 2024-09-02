import type { string_parameter_name } from '../../types/typeAliases';
import type { TODO_string } from '../../utils/organization/TODO_string';

/**
 * @@@
 */
export type ForeachJson = {
    /**
     * @@@
     */
    readonly formatName: TODO_string; // <- !!!!!!

    /**
     * @@@
     */
    readonly cellName: TODO_string; // <- !!!!!!

    /**
     * @@@
     */
    readonly parameterName: string_parameter_name;

    /**
     * @@@
     */
    readonly subparameterName: string_parameter_name;
};

/**
 * TODO: [🧠] Betetr name for `parameterName` and `subparameterName`
 */
