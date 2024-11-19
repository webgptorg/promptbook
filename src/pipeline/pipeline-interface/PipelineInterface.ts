import type { string_parameter_name } from '../../types/typeAliases';

/**
 * @@@
 */
export type PipelineInterface = {
    /**
     * @@@
     *
     * Note: Sorted alphabetically
     */
    inputParameterNames: Array<string_parameter_name>;

    /**
     * @@@
     *
     * Note: Sorted alphabetically
     */
    outputParameterNames: Array<string_parameter_name>;
};

/**
 * TODO: !!!!!! Change inputParameterNames to inputParameters<InputParameter>
 * TODO: [🧠] Better name than `PipelineInterface` to avoid confusion with typescript `interface`
 */
