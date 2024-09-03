import { spaceTrim } from 'spacetrim';
import type { Promisable, ReadonlyDeep } from 'type-fest';
import { forTime } from 'waitasecond';
import { joinLlmExecutionTools } from '../../_packages/core.index';
import { CreatePipelineExecutorSettings } from '../../_packages/types.index';
import {
    IMMEDIATE_TIME,
    IS_VERBOSE,
    LOOP_LIMIT,
    MAX_EXECUTION_ATTEMPTS,
    MAX_PARALLEL_COUNT,
    RESERVED_PARAMETER_NAMES,
} from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { preparePipeline } from '../../prepare/preparePipeline';
import type { ExecutionReportJson } from '../../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import { TaskProgress } from '../../types/TaskProgress';
import type { Parameters, string_name } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import { PROMPTBOOK_VERSION } from '../../version';
import { ExecutionTools } from '../ExecutionTools';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { addUsage, ZERO_USAGE } from '../utils/addUsage';
import { executeTemplate } from './20-executeTemplate';
import { filterJustOutputParameters } from './filterJustOutputParameters';

/**
 * @@@
 *
 * @private internal type of `executePipelinex`
 */
type ExecutePipelineOptions = {
    /**
     * @@@
     */
    inputParameters: Readonly<Parameters>;

    /**
     * @@@
     */
    tools: ExecutionTools;

    /**
     * @@@
     */
    onProgress?: (taskProgress: TaskProgress) => Promisable<void>;

    /**
     * @@@
     */
    pipeline: PipelineJson;

    /**
     * @@@
     */
    preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    setPreparedPipeline: (preparedPipeline: ReadonlyDeep<PipelineJson>) => void;

    /**
     * @@@
     */
    pipelineIdentification: string;

    /**
     * Optional settings for the pipeline executor
     */
    readonly settings?: Partial<CreatePipelineExecutorSettings>;
};

/**
 * @@@
 *
 * Note: This is not a `PipelineExecutor` (which is binded with one exact pipeline), but a utility function of `createPipelineExecutor` which creates `PipelineExecutor`
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executePipeline(options: ExecutePipelineOptions): Promise<PipelineExecutorResult> {
    const {
        inputParameters,
        tools,
        onProgress,
        pipeline,
        setPreparedPipeline,
        pipelineIdentification,
        settings = {},
    } = options;
    const {
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = MAX_PARALLEL_COUNT,
        isVerbose = IS_VERBOSE,
    } = settings;
    let { preparedPipeline } = options;

    const llmTools = joinLlmExecutionTools(...arrayableToArray(tools.llm));

    if (preparedPipeline === undefined) {
        preparedPipeline = await preparePipeline(pipeline, {
            llmTools,
            isVerbose,
            maxParallelCount,
        });
        setPreparedPipeline(preparedPipeline);
    }

    const errors: Array<PipelineExecutionError> = [];
    const warnings: Array<PipelineExecutionError /* <- [🧠][⚠] What is propper object type to handle warnings */> = [];

    const executionReport: ExecutionReportJson = {
        pipelineUrl: preparedPipeline.pipelineUrl,
        title: preparedPipeline.title,
        promptbookUsedVersion: PROMPTBOOK_VERSION,
        promptbookRequestedVersion: preparedPipeline.promptbookVersion,
        description: preparedPipeline.description,
        promptExecutions: [],
    };

    /**
     * Note: This is a flag to prevent `onProgress` call after the pipeline execution is finished
     */
    let isReturned = false;

    // Note: Check that all input input parameters are defined
    for (const parameter of preparedPipeline.parameters.filter(({ isInput }) => isInput)) {
        if (inputParameters[parameter.name] === undefined) {
            isReturned = true;

            if (onProgress !== undefined) {
                // Note: Wait a short time to prevent race conditions
                await forTime(IMMEDIATE_TIME);
            }

            return $asDeeplyFrozenSerializableJson(
                `Unuccessful PipelineExecutorResult (with missing parameter {${parameter.name}}) PipelineExecutorResult`,
                {
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(`Parameter {${parameter.name}} is required as an input parameter`),
                        ...errors,
                    ].map(serializeError),
                    warnings: [],
                    executionReport,
                    outputParameters: {},
                    usage: ZERO_USAGE,
                    preparedPipeline,
                },
            ) satisfies PipelineExecutorResult;
        }
    }

    // Note: Check that no extra input parameters are passed
    for (const parameterName of Object.keys(inputParameters)) {
        const parameter = preparedPipeline.parameters.find(({ name }) => name === parameterName);

        if (parameter === undefined) {
            warnings.push(
                new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                              Extra parameter {${parameterName}} is being passed which is not part of the pipeline.

                              ${block(pipelineIdentification)}
                          `,
                    ),
                ),
            );
        } else if (parameter.isInput === false) {
            isReturned = true;

            if (onProgress !== undefined) {
                // Note: Wait a short time to prevent race conditions
                await forTime(IMMEDIATE_TIME);
            }

            // TODO: [🧠] This should be also non-critical error
            return $asDeeplyFrozenSerializableJson(
                spaceTrim(
                    (block) => `
                          Unuccessful PipelineExecutorResult (with extra parameter {${
                              parameter.name
                          }}) PipelineExecutorResult

                          ${block(pipelineIdentification)}
                      `,
                ),
                {
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(
                            spaceTrim(
                                (block) => `
                                      Parameter {${parameter.name}} is passed as input parameter but it is not input

                                      ${block(pipelineIdentification)}
                                  `,
                            ),
                        ),
                        ...errors,
                    ].map(serializeError),
                    warnings: warnings.map(serializeError),
                    executionReport,
                    outputParameters: {},
                    usage: ZERO_USAGE,
                    preparedPipeline,
                },
            ) satisfies PipelineExecutorResult;
        }
    }

    let parametersToPass: Parameters = inputParameters;

    try {
        let resovedParameterNames: Array<string_name> = preparedPipeline.parameters
            .filter(({ isInput }) => isInput)
            .map(({ name }) => name);
        let unresovedTemplates: Array<ReadonlyDeep<TemplateJson>> = [...preparedPipeline.templates];
        let resolving: Array<Promise<void>> = [];

        let loopLimit = LOOP_LIMIT;
        while (unresovedTemplates.length > 0) {
            if (loopLimit-- < 0) {
                // Note: Really UnexpectedError not LimitReachedError - this should be catched during validatePipeline
                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                              Loop limit reached during resolving parameters pipeline execution

                              ${block(pipelineIdentification)}
                          `,
                    ),
                );
            }

            const currentTemplate = unresovedTemplates.find((template) =>
                template.dependentParameterNames.every((name) =>
                    [...resovedParameterNames, ...RESERVED_PARAMETER_NAMES].includes(name),
                ),
            );

            if (!currentTemplate && resolving.length === 0) {
                throw new UnexpectedError(
                    // TODO: [🐎] DRY
                    spaceTrim(
                        (block) => `
                              Can not resolve some parameters:

                              ${block(pipelineIdentification)}

                              Can not resolve:
                              ${block(
                                  unresovedTemplates
                                      .map(
                                          ({ resultingParameterName, dependentParameterNames }) =>
                                              `- Parameter {${resultingParameterName}} which depends on ${dependentParameterNames
                                                  .map((dependentParameterName) => `{${dependentParameterName}}`)
                                                  .join(' and ')}`,
                                      )
                                      .join('\n'),
                              )}

                              Resolved:
                              ${block(resovedParameterNames.map((name) => `- Parameter {${name}}`).join('\n'))}

                              Note: This should be catched in \`validatePipeline\`
                          `,
                    ),
                );
            } else if (!currentTemplate) {
                /* [🤹‍♂️] */ await Promise.race(resolving);
            } else {
                unresovedTemplates = unresovedTemplates.filter((template) => template !== currentTemplate);

                const work = /* [🤹‍♂️] not await */ executeTemplate({
                    currentTemplate,
                    preparedPipeline,
                    parametersToPass,
                    tools,
                    llmTools,
                    onProgress(progress: TaskProgress) {
                        if (isReturned) {
                            throw new UnexpectedError(
                                spaceTrim(
                                    (block) => `
                                          Can not call \`onProgress\` after pipeline execution is finished

                                          ${block(pipelineIdentification)}

                                          ${block(
                                              JSON.stringify(progress, null, 4)
                                                  .split('\n')
                                                  .map((line) => `> ${line}`)
                                                  .join('\n'),
                                          )}
                                      `,
                                ),
                            );
                        }

                        if (onProgress) {
                            onProgress(progress);
                        }
                    },
                    maxExecutionAttempts,
                    $executionReport: executionReport,
                    pipelineIdentification,
                })
                    .then((newParametersToPass) => {
                        parametersToPass = { ...newParametersToPass, ...parametersToPass };
                        resovedParameterNames = [...resovedParameterNames, currentTemplate.resultingParameterName];
                    })
                    .then(() => {
                        resolving = resolving.filter((w) => w !== work);
                    });

                resolving.push(work);
            }
        }

        await Promise.all(resolving);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        // Note: No need to rethrow UnexpectedError
        // if (error instanceof UnexpectedError) {

        // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [🤹‍♂️]
        const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

        // Note: Making this on separate line before `return` to grab errors [4]
        const outputParameters = filterJustOutputParameters({
            preparedPipeline,
            parametersToPass,
            $warnings: warnings,
            pipelineIdentification,
        });

        isReturned = true;

        if (onProgress !== undefined) {
            // Note: Wait a short time to prevent race conditions
            await forTime(IMMEDIATE_TIME);
        }

        return $asDeeplyFrozenSerializableJson(
            'Unuccessful PipelineExecutorResult (with misc errors) PipelineExecutorResult',
            {
                isSuccessful: false,
                errors: [error, ...errors].map(serializeError),
                warnings: warnings.map(serializeError),
                usage,
                executionReport,
                outputParameters,
                preparedPipeline,
            },
        ) satisfies PipelineExecutorResult;
    }

    // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [🤹‍♂️]
    const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

    // Note:  Making this on separate line before `return` to grab errors [4]
    const outputParameters = filterJustOutputParameters({
        preparedPipeline,
        parametersToPass,
        $warnings: warnings,
        pipelineIdentification,
    });

    isReturned = true;

    if (onProgress !== undefined) {
        // Note: Wait a short time to prevent race conditions
        await forTime(IMMEDIATE_TIME);
    }

    return $asDeeplyFrozenSerializableJson('Successful PipelineExecutorResult', {
        isSuccessful: true,
        errors: errors.map(serializeError),
        warnings: warnings.map(serializeError),
        usage,
        executionReport,
        outputParameters,
        preparedPipeline,
    }) satisfies PipelineExecutorResult;
}
