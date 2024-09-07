import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { Parameters } from '../../types/typeAliases';

/**
 * @@@
 *
 * @private internal type of `createPipelineExecutor`
 */
type FilterJustOutputParametersOptions = {
    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly parametersToPass: Readonly<Parameters>;

    /**
     * @@@
     */
    readonly $warnings: PipelineExecutionError[];

    /**
     * @@@
     */
    readonly pipelineIdentification: string;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export function filterJustOutputParameters(options: FilterJustOutputParametersOptions): Parameters {
    const { preparedPipeline, parametersToPass, $warnings, pipelineIdentification } = options;

    const outputParameters: Parameters = {};

    // Note: Filter ONLY output parameters
    // TODO: [👩🏾‍🤝‍👩🏻] Maybe use here `mapAvailableToExpectedParameters`
    for (const parameter of preparedPipeline.parameters.filter(({ isOutput }) => isOutput)) {
        if (parametersToPass[parameter.name] === undefined) {
            // [4]
            $warnings.push(
                new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                            Parameter {${
                                parameter.name
                            }} should be an output parameter, but it was not generated during pipeline execution

                            ${block(pipelineIdentification)}
                        `,
                    ),
                ),
                // <- TODO: This should be maybe `UnexpectedError` because it should be catched during `validatePipeline`
            );
            continue;
        }
        outputParameters[parameter.name] = parametersToPass[parameter.name] || '';
    }

    return outputParameters;
}
