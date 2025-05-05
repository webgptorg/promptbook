import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { string_parameter_name } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
import { union } from '../sets/union';

/**
 * Options for mapping available parameters to expected parameters in a pipeline task.
 */
type MakeapAvailableToExpectedParametersOptions = {
    /**
     * The set of expected parameter names (keys) for the task, all values are null.
     */
    readonly expectedParameters: Readonly<Record<string_parameter_name, null>>;

    /**
     * The set of available parameters (name-value pairs) to map to the expected parameters.
     */
    readonly availableParameters: Readonly<Record<string_parameter_name, string_parameter_value>>;
};

/**
 * Maps available parameters to expected parameters for a pipeline task.
 *
 * The strategy is:
 * 1) First, match parameters by name where both available and expected.
 * 2) Then, if there are unmatched expected and available parameters, map them by order.
 *
 * @throws {PipelineExecutionError} If the number of unmatched expected and available parameters does not match, or mapping is ambiguous.
 * @private within the repository used in `createPipelineExecutor`
 */
export function mapAvailableToExpectedParameters(
    options: MakeapAvailableToExpectedParametersOptions,
): Readonly<Record<string_parameter_name, string_parameter_value>> {
    const { expectedParameters, availableParameters } = options;

    const availableParametersNames = new Set(Object.keys(availableParameters));
    const expectedParameterNames = new Set(Object.keys(expectedParameters));

    const mappedParameters: Record<string_parameter_name, string_parameter_value> = {};

    // Phase 1️⃣: Matching mapping
    for (const parameterName of Array.from(union(availableParametersNames, expectedParameterNames))) {
        // Situation: Parameter is available and expected
        if (availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
            mappedParameters[parameterName] = availableParameters[parameterName]!;
            // <- Note: [👩‍👩‍👧] Maybe detect parameter collision here?
            availableParametersNames.delete(parameterName);
            expectedParameterNames.delete(parameterName);
        }

        // Situation: Parameter is available but NOT expected
        else if (availableParametersNames.has(parameterName) && !expectedParameterNames.has(parameterName)) {
            // [🐱‍👤] Do not pass this parameter to prompt - Maybe use it non-matching mapping
        }

        // Situation: Parameter is NOT available BUT expected
        else if (!availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
            //  Do nothing here - this will be maybe fixed in the non-matching mapping
        }
    }

    if (expectedParameterNames.size === 0) {
        // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent accidental modifications after mapping
        Object.freeze(mappedParameters);
        return mappedParameters;
    }

    // Phase 2️⃣: Non-matching mapping
    if (expectedParameterNames.size !== availableParametersNames.size) {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    Can not map available parameters to expected parameters

                    Mapped parameters:
                    ${block(
                        Object.keys(mappedParameters)
                            .map((parameterName) => `- {${parameterName}}`)
                            .join('\n'),
                    )}

                    Expected parameters which can not be mapped:
                    ${block(
                        Array.from(expectedParameterNames)
                            .map((parameterName) => `- {${parameterName}}`)
                            .join('\n'),
                    )}

                    Remaining available parameters:
                    ${block(
                        Array.from(availableParametersNames)
                            .map((parameterName) => `- {${parameterName}}`)
                            .join('\n'),
                    )}

                `,
            ),
        );
    }

    const expectedParameterNamesArray = Array.from(expectedParameterNames);
    const availableParametersNamesArray = Array.from(availableParametersNames);

    for (let i = 0; i < expectedParameterNames.size; i++) {
        mappedParameters[expectedParameterNamesArray[i]!] = availableParameters[availableParametersNamesArray[i]!]!;
    }

    // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent accidental modifications after mapping
    Object.freeze(mappedParameters);
    return mappedParameters;
}
