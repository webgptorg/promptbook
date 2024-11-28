import type { InputParameterJson } from '../PipelineJson/ParameterJson';
import type { OutputParameterJson } from '../PipelineJson/ParameterJson';

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
    readonly inputParameters: ReadonlyArray<InputParameterJson>;

    /**
     * @@@
     *
     * Note: Sorted alphabetically
     */
    readonly outputParameters: ReadonlyArray<OutputParameterJson>;
};

/**
 * TODO: [🧠][🤓] How to pass optional parameters - for example summary in FORMFACTOR Translator
 * TODO: [🧠] Better name than `PipelineInterface` to avoid confusion with typescript `interface`
 */
