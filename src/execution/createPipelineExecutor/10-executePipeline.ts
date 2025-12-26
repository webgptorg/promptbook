import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { forTime } from 'waitasecond';
import { IMMEDIATE_TIME } from '../../config';
import { LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import { preparePipeline } from '../../prepare/preparePipeline';
import type { InputParameters } from '../../types/typeAliases';
import type { Parameters } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import type { string_reserved_parameter_name } from '../../types/typeAliases';
import { valueToString } from '../../utils/parameters/valueToString';
import { exportJson } from '../../utils/serialization/exportJson';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { addUsage } from '../utils/addUsage';
import type { LlmCall } from '../../types/LlmCall';
import { ZERO_USAGE } from '../utils/usage-constants';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executeTask } from './20-executeTask';
import { filterJustOutputParameters } from './filterJustOutputParameters';

/**
 * Options for executing an entire pipeline, including input parameters, pipeline context, and progress callbacks.
 *
 * @private internal type of `executePipeline`
 */
type ExecutePipelineOptions = Required<CreatePipelineExecutorOptions> & {
    /**
     * The input parameters provided by the user for pipeline execution.
     */
    readonly inputParameters: Readonly<InputParameters>;

    /**
     * Optional callback invoked with partial results as the pipeline execution progresses.
     */
    onProgress?(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;

    /**
     * The pipeline definition to execute.
     */
    readonly pipeline: PipelineJson;

    /**
     * The prepared and validated pipeline, ready for execution.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * Callback to update the prepared pipeline reference after preparation.
     */
    setPreparedPipeline(preparedPipeline: ReadonlyDeep<PipelineJson>): void;

    /**
     * String identifier for the pipeline, used in error messages and reporting.
     */
    readonly pipelineIdentification: string;
};

/**
 * Executes an entire pipeline, resolving tasks in dependency order, handling errors, and reporting progress.
 *
 * Note: This is not a `PipelineExecutor` (which is bound to a single pipeline), but a utility function used by `createPipelineExecutor` to create a `PipelineExecutor`.
 *
 * @param options - Options for execution, including input parameters, pipeline, and callbacks.
 * @returns The result of the pipeline execution, including output parameters, errors, and usage statistics.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executePipeline(options: ExecutePipelineOptions): Promise<PipelineExecutorResult> {
    const {
        inputParameters,
        tools,
        onProgress,
        logLlmCall,
        pipeline,
        setPreparedPipeline,
        pipelineIdentification,
        maxParallelCount,
        rootDirname,
        isVerbose,
    } = options;
    let { preparedPipeline } = options;

    if (preparedPipeline === undefined) {
        preparedPipeline = await preparePipeline(pipeline, tools, {
            rootDirname,
            isVerbose,
            maxParallelCount,
        });
        setPreparedPipeline(preparedPipeline);
    }

    const errors: Array<PipelineExecutionError> = [];
    const warnings: Array<PipelineExecutionError /* <- [🧠][⚠] What is proper object type to handle warnings */> = [];

    const executionReport: WritableDeep<ExecutionReportJson> = {
        pipelineUrl: preparedPipeline.pipelineUrl,
        title: preparedPipeline.title,
        promptbookUsedVersion: PROMPTBOOK_ENGINE_VERSION,
        promptbookRequestedVersion: preparedPipeline.bookVersion,
        description: preparedPipeline.description,
        promptExecutions: [],
    };

    /**
     * Note: This is a flag to prevent `onProgress` call after the pipeline execution is finished
     */
    let isReturned = false;

    // Note: Report all output parameters upfront as empty strings
    if (onProgress) {
        const emptyOutputParameters = Object.fromEntries(
            preparedPipeline.parameters.filter((param) => !param.isInput).map((param) => [param.name, '']),
            // <- TODO: [🧠] Should be reported intermediate parameters or just output parameters?
        );

        onProgress({
            outputParameters: emptyOutputParameters,
        });
    }

    // Note: Check that all input input parameters are defined
    for (const parameter of preparedPipeline.parameters.filter(({ isInput }) => isInput)) {
        if (inputParameters[parameter.name] === undefined) {
            isReturned = true;

            if (onProgress !== undefined) {
                // Note: Wait a short time to prevent race conditions
                await forTime(IMMEDIATE_TIME);
            }

            return exportJson({
                name: `executionReport`,
                message: `Unsuccessful PipelineExecutorResult (with missing parameter {${parameter.name}}) PipelineExecutorResult`,
                order: [],
                value: {
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(
                            `Parameter \`{${parameter.name}}\` is required as an input parameter`,
                        ),
                        ...errors,
                    ].map(serializeError),
                    warnings: [],
                    executionReport,
                    outputParameters: {},
                    usage: ZERO_USAGE,
                    preparedPipeline,
                },
            }) satisfies PipelineExecutorResult;
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
            return exportJson({
                name: 'pipelineExecutorResult',
                message: spaceTrim(
                    (block) => `
                        Unsuccessful PipelineExecutorResult (with extra parameter {${
                            parameter.name
                        }}) PipelineExecutorResult

                        ${block(pipelineIdentification)}
                    `,
                ),
                order: [],
                value: {
                    isSuccessful: false,
                    errors: [
                        new PipelineExecutionError(
                            spaceTrim(
                                (block) => `
                                    Parameter \`{${parameter.name}}\` is passed as input parameter but it is not input

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
            }) satisfies PipelineExecutorResult;
        }
    }

    let parametersToPass: Parameters = Object.fromEntries(
        Object.entries(inputParameters).map(([key, value]) => [key, valueToString(value)]),
    );

    try {
        let resovedParameterNames: ReadonlyArray<string_name> = preparedPipeline.parameters
            .filter(({ isInput }) => isInput)
            .map(({ name }) => name);
        let unresovedTasks: ReadonlyArray<ReadonlyDeep<TaskJson>> = [...preparedPipeline.tasks];
        let resolving: Array<Promise<void>> = [];

        let loopLimit = LOOP_LIMIT;
        while (unresovedTasks.length > 0) {
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

            const currentTask = unresovedTasks.find((task) =>
                task.dependentParameterNames.every((name) =>
                    [...resovedParameterNames, ...RESERVED_PARAMETER_NAMES].includes(name),
                ),
            );

            if (!currentTask && resolving.length === 0) {
                throw new UnexpectedError(
                    // TODO: [🐎] DRY
                    spaceTrim(
                        (block) => `
                            Can not resolve some parameters:

                            ${block(pipelineIdentification)}

                            **Can not resolve:**
                            ${block(
                                unresovedTasks
                                    .map(
                                        ({ resultingParameterName, dependentParameterNames }) =>
                                            `- Parameter \`{${resultingParameterName}}\` which depends on ${dependentParameterNames
                                                .map((dependentParameterName) => `\`{${dependentParameterName}}\``)
                                                .join(' and ')}`,
                                    )
                                    .join('\n'),
                            )}

                            **Resolved:**
                            ${block(
                                resovedParameterNames
                                    .filter(
                                        (name) =>
                                            !RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name),
                                    )
                                    .map((name) => `- Parameter \`{${name}}\``)
                                    .join('\n'),
                            )}

                            **Reserved (which are available):**
                            ${block(
                                resovedParameterNames
                                    .filter((name) =>
                                        RESERVED_PARAMETER_NAMES.includes(name as string_reserved_parameter_name),
                                    )
                                    .map((name) => `- Parameter \`{${name}}\``)
                                    .join('\n'),
                            )}

                            *Note: This should be catched in \`validatePipeline\`*
                        `,
                    ),
                );
            } else if (!currentTask) {
                /* [🤹‍♂️] */ await Promise.race(resolving);
            } else {
                unresovedTasks = unresovedTasks.filter((task) => task !== currentTask);

                const work = /* [🤹‍♂️] not await */ executeTask({
                    ...options,
                    currentTask,
                    preparedPipeline,
                    parametersToPass,
                    tools,
                    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>) {
                        if (isReturned) {
                            throw new UnexpectedError(
                                spaceTrim(
                                    (block) => `
                                        Can not call \`onProgress\` after pipeline execution is finished

                                        ${block(pipelineIdentification)}

                                        ${block(
                                            JSON.stringify(newOngoingResult, null, 4)
                                                .split('\n')
                                                .map((line) => `> ${line}`)
                                                .join('\n'),
                                        )}
                                    `,
                                ),
                            );
                        }

                        if (onProgress) {
                            onProgress(newOngoingResult);
                        }
                    },
                    logLlmCall,
                    $executionReport: executionReport,
                    pipelineIdentification: spaceTrim(
                        (block) => `
                            ${block(pipelineIdentification)}
                            Task name: ${currentTask.name}
                            Task title: ${currentTask.title}
                        `,
                    ),
                })
                    .then((newParametersToPass) => {
                        parametersToPass = { ...newParametersToPass, ...parametersToPass };
                        resovedParameterNames = [...resovedParameterNames, currentTask.resultingParameterName];
                    })
                    .then(() => {
                        resolving = resolving.filter((workItem) => workItem !== work);
                    });
                // <- Note: Errors are catched here [3]
                //    TODO: BUT if in multiple tasks are errors, only the first one is catched so maybe we should catch errors here and save them to errors array here

                resolving.push(work);
            }
        }

        await Promise.all(resolving);
    } catch (error /* <- Note: [3] */) {
        assertsError(error);

        // Note: No need to rethrow UnexpectedError
        // if (error instanceof UnexpectedError) {

        // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [🤹‍♂️]
        const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

        // Note: Making this on separate line before `return` to grab errors [4]
        const outputParameters = filterJustOutputParameters({
            preparedPipeline,
            parametersToPass,
            $warnings: warnings, // <- [🏮]
            pipelineIdentification,
        });

        isReturned = true;

        if (onProgress !== undefined) {
            // Note: Wait a short time to prevent race conditions
            await forTime(IMMEDIATE_TIME);
        }

        return exportJson({
            name: 'pipelineExecutorResult',
            message: `Unsuccessful PipelineExecutorResult (with misc errors) PipelineExecutorResult`,
            order: [],
            value: {
                isSuccessful: false,
                errors: [error, ...errors].map(serializeError),
                warnings: warnings.map(serializeError),
                usage,
                executionReport,
                outputParameters,
                preparedPipeline,
            },
        }) satisfies PipelineExecutorResult;
    }

    // Note: Count usage, [🧠] Maybe put to separate function executionReportJsonToUsage + DRY [🤹‍♂️]
    const usage = addUsage(...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE));

    // Note:  Making this on separate line before `return` to grab errors [4]
    const outputParameters = filterJustOutputParameters({
        preparedPipeline,
        parametersToPass,
        $warnings: warnings, // <- [🏮]
        pipelineIdentification,
    });

    isReturned = true;

    if (onProgress !== undefined) {
        // Note: Wait a short time to prevent race conditions
        await forTime(IMMEDIATE_TIME);
    }

    return exportJson({
        name: 'pipelineExecutorResult',
        message: `Successful PipelineExecutorResult`,
        order: [],
        value: {
            isSuccessful: true,
            errors: errors.map(serializeError),
            warnings: warnings.map(serializeError),
            usage,
            executionReport,
            outputParameters,
            preparedPipeline,
        },
    }) satisfies PipelineExecutorResult;
}
