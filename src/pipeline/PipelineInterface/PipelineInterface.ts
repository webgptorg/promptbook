import type { string_parameter_name } from '../../types/typeAliases';

/**
 * @@@
 * 
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type PipelineInterface = {
    /**
     * @@@
     *
     * Note: Sorted alphabetically
     */
    readonly inputParameterNames: ReadonlyArray<string_parameter_name>;

    /**
     * @@@
     *
     * Note: Sorted alphabetically
     */
    readonly outputParameterNames: ReadonlyArray<string_parameter_name>;
};

/**
 * TODO: !!!!!! Change inputParameterNames to inputParameters<InputParameter>
 * TODO: [🧠] Better name than `PipelineInterface` to avoid confusion with typescript `interface`
 */
