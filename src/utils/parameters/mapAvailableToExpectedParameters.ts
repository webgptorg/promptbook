import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { string_parameter_name, string_parameter_value } from '../../types/typeAliases';
import { union } from '../sets/union';

/**
 * @@@
 */
type MakeapAvailableToExpectedParametersOptions = {
    /**
     * @@@
     */
    readonly expectedParameters: Readonly<Record<string_parameter_name, null>>;

    /**
     * @@@
     */
    readonly availableParameters: Readonly<Record<string_parameter_name, string_parameter_value>>;
};

/**
 * Maps available parameters to expected parameters
 *
 * The strategy is:
 * 1) @@@
 * 2) @@@
 *
 * @throws {PipelineExecutionError} @@@
 * @private within the repository used in `createPipelineExecutor`
 */
export function mapAvailableToExpectedParameters(
    options: MakeapAvailableToExpectedParametersOptions,
): Readonly<Record<string_parameter_name, string_parameter_value>> {
    const { expectedParameters, availableParameters } = options;

    const availableParametersNames = new Set(Object.keys(availableParameters));
    const expectedParameterNames = new Set(Object.keys(expectedParameters));

    const mappedParameters: Record<string_parameter_name, string_parameter_value> = {};

    // TODO: !!!!!! Special situation 1:1 with arbitrary parameter names

    // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
    for (const parameterName of Array.from(union(availableParametersNames, expectedParameterNames))) {
        // Situation: Parameter is available and expected
        if (availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
            mappedParameters[parameterName] = availableParameters[parameterName]!;
            // <- Note: [👩‍👩‍👧] Maybe detect parameter collision here?
        }

        // Situation: Parameter is available but NOT expected
        else if (availableParametersNames.has(parameterName) && !expectedParameterNames.has(parameterName)) {
            // [🐱‍👤] Do not pass this parameter to prompt
        }

        // Situation: Parameter is NOT available BUT expected
        else if (!availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
            throw new PipelineExecutionError(
                spaceTrim(
                    (block) => `
                        Parameter {${parameterName}} is NOT available

                        - You have probbably passed wrong data to pipeline

                        Expected parameters:
                        ${block(
                            Array.from(expectedParameterNames)
                                .map((parameterName) => `- {${parameterName}}`)
                                .join('\n'),
                        )}

                        Available parameters:
                        ${block(
                            Array.from(availableParametersNames)
                                .map((parameterName) => `- {${parameterName}}`)
                                .join('\n'),
                        )}

                    `,
                ),
            );
        }
    }

    // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent @@@
    Object.freeze(mappedParameters);
    return mappedParameters;
}
