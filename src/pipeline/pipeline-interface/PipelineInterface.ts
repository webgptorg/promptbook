import { string_parameter_name } from '@promptbook/types';

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
 * TODO: [🧠] Better name than `PipelineInterface` to avoid confusion with typescript `interface`
 */
