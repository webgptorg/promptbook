import spaceTrim from 'spacetrim';
import type { PartialDeep, Promisable } from 'type-fest';
import { BIG_DATASET_TRESHOLD } from '../../config';
import { FAILED_VALUE_PLACEHOLDER } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { FORMAT_DEFINITIONS } from '../../formats/index';
import type { string_parameter_name } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { mapAvailableToExpectedParameters } from '../../utils/parameters/mapAvailableToExpectedParameters';
import type { LlmCall } from '../../types/LlmCall';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import type { ExecuteAttemptsOptions } from './40-executeAttempts';
import { executeAttempts } from './40-executeAttempts';

/**
 * Options for executing a pipeline task that involves formatting subvalues (e.g., iterating over CSV rows).
 * Extends ExecuteAttemptsOptions with a progress callback.
 *
 * @private internal type of `executeFormatSubvalues`
 */
type ExecuteFormatCellsOptions = ExecuteAttemptsOptions & {
    /**
     * Callback invoked with partial results as the execution progresses.
     */
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;
};

/**
 * Executes a pipeline task that requires mapping or iterating over subvalues of a parameter (such as rows in a CSV).
 * Handles format and subformat resolution, error handling, and progress reporting.
 *
 * @param options - Options for execution, including task details and progress callback.
 * @returns The result of the subvalue mapping or execution attempts.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeFormatSubvalues(options: ExecuteFormatCellsOptions): Promise<TODO_any> {
    const {
        task,
        jokerParameterNames,
        parameters,
        priority,
        csvSettings,
        onProgress,
        logLlmCall,
        pipelineIdentification,
    } = options;

    if (task.foreach === undefined) {
        return /* not await */ executeAttempts({ ...options, logLlmCall });
    }

    if (jokerParameterNames.length !== 0) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    JOKER parameters are not supported together with FOREACH command

                    [🧞‍♀️] This should be prevented in \`validatePipeline\`

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    const parameterValue = parameters[task.foreach.parameterName] || '';

    const formatDefinition = FORMAT_DEFINITIONS.find(
        (formatDefinition) =>
            [formatDefinition.formatName, ...(formatDefinition.aliases || [])].includes(task.foreach!.formatName),
        // <- Note: All names here are already normalized
    );

    if (formatDefinition === undefined) {
        throw new UnexpectedError(
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
            spaceTrim(
                (block) => `
                    Unsupported format "${task.foreach!.formatName}"

                    Available formats:
                    ${block(
                        FORMAT_DEFINITIONS.map((formatDefinition) => formatDefinition.formatName)
                            .map((formatName) => `- ${formatName}`)
                            .join('\n'),
                    )}

                    [⛷] This should never happen because format name should be validated during parsing

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    const subvalueParser = formatDefinition.subvalueParsers.find(
        (subvalueParser) =>
            [subvalueParser.subvalueName, ...(subvalueParser.aliases || [])].includes(task.foreach!.subformatName),
        // <- Note: All names here are already normalized
    );

    if (subvalueParser === undefined) {
        throw new UnexpectedError(
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
            spaceTrim(
                (block) => `
                    Unsupported subformat name "${task.foreach!.subformatName}" for format "${task.foreach!.formatName}"

                    Available subformat names for format "${formatDefinition.formatName}":
                    ${block(
                        formatDefinition.subvalueParsers
                            .map((subvalueParser) => subvalueParser.subvalueName)
                            .map((subvalueName) => `- ${subvalueName}`)
                            .join('\n'),
                    )}

                    [⛷] This should never happen because subformat name should be validated during parsing

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    let formatSettings: TODO_any;

    if (formatDefinition.formatName === 'CSV') {
        formatSettings = csvSettings;
        // <- TODO: [🤹‍♂️] More universal, make similar pattern for other formats for example \n vs \r\n in text
    }

    const resultString = await subvalueParser.mapValues({
        value: parameterValue,
        outputParameterName: task.foreach.outputSubparameterName,
        settings: formatSettings,
        onProgress(partialResultString) {
            return onProgress(
                Object.freeze({
                    [task.resultingParameterName]: partialResultString,
                }),
            );
        },
        async mapCallback(subparameters, index, length) {
            let mappedParameters: Record<string_parameter_name, string_parameter_value>;

            try {
                mappedParameters = mapAvailableToExpectedParameters({
                    expectedParameters: Object.fromEntries(
                        task.foreach!.inputSubparameterNames.map((subparameterName) => [subparameterName, null]),
                    ),
                    availableParameters: subparameters,
                });
            } catch (error) {
                if (!(error instanceof PipelineExecutionError)) {
                    throw error;
                }

                const highLevelError = new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                            ${(error as PipelineExecutionError).message}

                            This is error in FOREACH command when mapping ${formatDefinition.formatName} ${
                            subvalueParser.subvalueName
                        } data (${index + 1}/${length})
                            You have probably passed wrong data to pipeline or wrong data was generated which are processed by FOREACH command

                            ${block(pipelineIdentification)}
                        `,
                    ),
                );

                if (length > BIG_DATASET_TRESHOLD) {
                    console.error(highLevelError);
                    return FAILED_VALUE_PLACEHOLDER;
                }

                throw highLevelError;
            }

            const allSubparameters = {
                ...parameters,
                ...mappedParameters,
            };

            Object.freeze(allSubparameters);

            try {
                const subresultString = await executeAttempts({
                    ...options,
                    priority: priority + index,
                    parameters: allSubparameters,
                    pipelineIdentification: spaceTrim(
                        (block) => `
                            ${block(pipelineIdentification)}
                            Subparameter index: ${index}
                        `,
                    ),
                });
                return subresultString;
            } catch (error) {
                if (length > BIG_DATASET_TRESHOLD) {
                    console.error(
                        spaceTrim(
                            (block) => `
                              ${(error as PipelineExecutionError).message}

                              This is error in FOREACH command when processing ${formatDefinition.formatName} ${
                                subvalueParser.subvalueName
                            } data (${index + 1}/${length})

                              ${block(pipelineIdentification)}
                          `,
                        ),
                    );
                    return FAILED_VALUE_PLACEHOLDER;
                }
                throw error;
            }
        },
    });

    return resultString;
}
