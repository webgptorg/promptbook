import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { string_parameter_name } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
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
        // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent @@@
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

    // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent @@@
    Object.freeze(mappedParameters);
    return mappedParameters;
}
