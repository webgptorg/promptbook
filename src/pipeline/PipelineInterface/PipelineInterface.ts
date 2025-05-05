import type { InputParameterJson } from '../PipelineJson/ParameterJson';
import type { OutputParameterJson } from '../PipelineJson/ParameterJson';

/**
 * Defines the interface of a Promptbook pipeline, specifying its input and output parameters.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type PipelineInterface = {
    /**
     * Input parameters required by the pipeline.
     *
     * Note: Sorted alphabetically
     */
    readonly inputParameters: ReadonlyArray<InputParameterJson>;

    /**
     * Output parameters produced by the pipeline.
     *
     * Note: Sorted alphabetically
     */
    readonly outputParameters: ReadonlyArray<OutputParameterJson>;
};
