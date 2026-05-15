import colors from 'colors';
import prompts from 'prompts';
import { spaceTrim } from 'spacetrim';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { string_parameter_name, string_parameter_value } from '../../../types/string_name';
import { countLines } from '../../../utils/expectation-counters/countLines';
import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * Resolves all missing input parameters while keeping the current interactive and non-interactive behavior.
 *
 * @private internal utility of `$initializeRunCommand`
 */
export async function resolveRunInputParameters(options: {
    readonly pipeline: PipelineJson;
    readonly inputParameters: Record<string_parameter_name, string_parameter_value>;
    readonly isInteractive: boolean;
}): Promise<Record<string_parameter_name, string_parameter_value>> {
    const { pipeline, inputParameters, isInteractive } = options;
    const questions = createRunInputQuestions(pipeline, inputParameters);

    if (isInteractive === false && questions.length !== 0) {
        console.error(colors.red(createRunMissingInputParametersMessage(pipeline, inputParameters, questions)));
        return process.exit(1);
    }

    const response = await prompts(questions as TODO_any);
    //                     <- TODO: [🧠][🍼] Change behavior according to the formfactor

    return { ...inputParameters, ...response };
    //      <- TODO: Maybe do some validation of the response (and --json argument which is passed)
}

/**
 * Builds prompt questions for all missing input parameters of the pipeline.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunInputQuestions(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
): Array<TODO_any> {
    return pipeline.parameters
        .filter(({ isInput }) => isInput)
        .filter(({ name }) => typeof inputParameters[name] !== 'string')
        .map(({ name, exampleValues }) => {
            let message = name;
            let initial = '';

            if (exampleValues && exampleValues.length > 0) {
                const exampleValuesFiltered = exampleValues.filter((exampleValue) => countLines(exampleValue) <= 1);

                if (exampleValuesFiltered.length !== 0) {
                    message += ` (e.g. ${exampleValuesFiltered.join(', ')})`;
                }

                initial = exampleValues[0] || '';
            }

            return {
                type: 'text',
                name,
                message,
                initial,
                // TODO: Maybe use> validate: value => value < 18 ? `Forbidden` : true
            };
        });
}

/**
 * Creates the existing non-interactive error message for missing input parameters.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunMissingInputParametersMessage(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
    questions: Array<TODO_any>,
): string {
    return spaceTrim(
        (block) => `
            When using --no-interactive you need to pass all the input parameters through --json

            You are missing:
            ${block(
                pipeline.parameters
                    .filter(({ isInput }) => isInput)
                    .filter(
                        ({ name: parameterName }) =>
                            !questions.some(({ name: questionName }) => questionName === parameterName),
                    )
                    .map(({ name, description }) => `- **${name}** ${description}`)
                    .join('\n'),
            )}

            Example:
            --json '${createRunJsonInputExample(pipeline, inputParameters)}'
        `,
    );
}

/**
 * Creates the example JSON payload shown for missing non-interactive input parameters.
 *
 * @private internal utility of `$initializeRunCommand`
 */
function createRunJsonInputExample(
    pipeline: PipelineJson,
    inputParameters: Record<string_parameter_name, string_parameter_value>,
): string {
    return JSON.stringify(
        Object.fromEntries(
            pipeline.parameters
                .filter(({ isInput }) => isInput)
                .map(({ name, exampleValues }) => [name, inputParameters[name] || (exampleValues || [])[0] || '...']),
        ),
    )
        .split("'")
        .join("\\'");
}

// Note: [🟡] Code for CLI command [resolveRunInputParameters](src/cli/cli-commands/run/resolveRunInputParameters.ts) should never be published outside of `@promptbook/cli`
