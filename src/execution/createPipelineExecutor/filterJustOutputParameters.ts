import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { Parameters } from '../../types/typeAliases';

/**
 * Options for filtering and extracting only output parameters from a pipeline execution.
 *
 * @private internal type of `createPipelineExecutor`
 */
type FilterJustOutputParametersOptions = {
    /**
     * The fully prepared pipeline containing parameter definitions.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * The parameters passed to the pipeline, including both input and output values.
     */
    readonly parametersToPass: Readonly<Parameters>;

    /**
     * Array to collect warnings encountered during parameter extraction.
     */
    readonly $warnings: PipelineExecutionError[];
    // <- [🏮]

    /**
     * String identifier for the pipeline, used in warning messages.
     */
    readonly pipelineIdentification: string;
};

/**
 * Filters and returns only the output parameters from the provided pipeline execution options.
 * Adds warnings for any expected output parameters that are missing.
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
                            Parameter \`{${
                                parameter.name
                            }}\` should be an output parameter, but it was not generated during pipeline execution

                            Note: This is a warning which happened after the pipeline was executed, and \`{${
                                parameter.name
                            }}\` was not for some reason defined in output parameters

                            All parameters:
                            ${block(
                                preparedPipeline.parameters
                                    .map(({ name, isInput, isOutput, description }) => {
                                        let line = `\`{${name}}\``;

                                        if (isInput) {
                                            line += ' `[input parameter]`';
                                        }

                                        if (isOutput) {
                                            line += ' `[output parameter]`';
                                        }

                                        if (parametersToPass[name] === undefined) {
                                            line += ` <- Warning: Should be in the output but its not |`;
                                        }

                                        if (description) {
                                            line += ` ${description}`;
                                        }

                                        return line;
                                    })
                                    .map((line, index) => `${index + 1}) ${line}`)
                                    .join('\n'),
                            )}

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
