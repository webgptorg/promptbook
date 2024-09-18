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
    readonly subparameterNames: Array<string_parameter_name>; // <- TODO: !!!!!! Use ParameterJson and split into input/output
};
