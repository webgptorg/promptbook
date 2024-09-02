import { spaceTrim } from 'spacetrim';
import type { Promisable } from 'type-fest';
import { forTime } from 'waitasecond';
import { IMMEDIATE_TIME } from '../../config';
import { IS_VERBOSE } from '../../config';
import { LOOP_LIMIT } from '../../config';
import { MAX_EXECUTION_ATTEMPTS } from '../../config';
import { MAX_PARALLEL_COUNT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { joinLlmExecutionTools } from '../../llm-providers/multiple/joinLlmExecutionTools';
import { isPipelinePrepared } from '../../prepare/isPipelinePrepared';
import { preparePipeline } from '../../prepare/preparePipeline';
import type { ExecutionReportJson } from '../../types/execution-report/ExecutionReportJson';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import { PROMPTBOOK_VERSION } from '../../version';
import type { PipelineExecutor } from '../PipelineExecutor';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { addUsage } from '../utils/addUsage';
import { ZERO_USAGE } from '../utils/addUsage';
import type { CreatePipelineExecutorOptions } from './CreatePipelineExecutorOptions';
import { executeSingleTemplate } from './executeSingleTemplate';
import { filterJustOutputParameters } from './filterJustOutputParameters';

/**
 * Creates executor function from pipeline and execution tools.
 *
 * @returns The executor function
 * @throws {PipelineLogicError} on logical error in the pipeline
 * @public exported from `@promptbook/core`
 */
export function createPipelineExecutor(options: CreatePipelineExecutorOptions): PipelineExecutor {
    const { pipeline, tools, settings = {} } = options;
    const {
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = MAX_PARALLEL_COUNT,
        isVerbose = IS_VERBOSE,
        isNotPreparedWarningSupressed = false,
    } = settings;

    validatePipeline(pipeline);

    const pipelineIdentification = (() => {
        // Note: This is a 😐 implementation of [🚞]
        const _: Array<string> = [];

        if (pipeline.sourceFile !== undefined) {
            _.push(`File: ${pipeline.sourceFile}`);
        }

        if (pipeline.pipelineUrl !== undefined) {
            _.push(`Url: ${pipeline.pipelineUrl}`);
        }

        return _.join('\n');
    })();

    const llmTools = joinLlmExecutionTools(...arrayableToArray(tools.llm));

    let preparedPipeline: PipelineJson;

    if (isPipelinePrepared(pipeline)) {
        preparedPipeline = pipeline;
    } else if (isNotPreparedWarningSupressed !== true) {
        console.warn(
            spaceTrim(
                (block) => `
                    Pipeline is not prepared

                    ${block(pipelineIdentification)}

                    It will be prepared ad-hoc before the first execution and **returned as \`preparedPipeline\` in \`PipelineExecutorResult\`**
                    But it is recommended to prepare the pipeline during collection preparation

                    @see more at https://ptbk.io/prepare-pipeline
                `,
            ),
        );
    }

    const pipelineExecutor: PipelineExecutor = async (
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PipelineExecutorResult> => {
        if (preparedPipeline === undefined) {
            preparedPipeline = await preparePipeline(pipeline, {
                llmTools,
                isVerbose,
                maxParallelCount,
            });
        }

        const errors: Array<PipelineExecutionError> = [];
        const warnings: Array<PipelineExecutionError /* <- [🧠][⚠] What is propper object type to handle warnings */> =
            [];

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
                            new PipelineExecutionError(
                                `Parameter {${parameter.name}} is required as an input parameter`,
                            ),
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
            let unresovedTemplates: Array<TemplateJson> = [...preparedPipeline.templates];
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

                    const work = /* [🤹‍♂️] not await */ executeSingleTemplate({
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
            const usage = addUsage(
                ...executionReport.promptExecutions.map(({ result }) => result?.usage || ZERO_USAGE),
            );

            // Note: Making this on separate line before `return` to grab errors [4]
            const outputParameters = filterJustOutputParameters(
                preparedPipeline,
                parametersToPass,
                warnings,
                pipelineIdentification,
            );

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
        const outputParameters = filterJustOutputParameters(
            preparedPipeline,
            parametersToPass,
            warnings,
            pipelineIdentification,
        );

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
    };

    return pipelineExecutor;
}

/**
 * TODO: [🤹‍♂️] Make some smarter system for limiting concurrent executions MAX_PARALLEL_TOTAL, MAX_PARALLEL_PER_LLM
 * TODO: !!! Identify not only pipeline BUT exact template ${block(pipelineIdentification)}
 * TODO: Use isVerbose here (not only pass to `preparePipeline`)
 * TODO: [🧠][🌳] Use here `countTotalUsage` and put preparation and prepared pipiline to report
 * TODO: [🪂] Use maxParallelCount here (not only pass to `preparePipeline`)
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🧠] When not meet expectations in DIALOG_TEMPLATE, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePipelineExecutorOptions are just connected to PipelineExecutor so do not extract to types folder
 * TODO: [🧠][🍸] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][💷] `assertsExecutionSuccessful` should be the method of `PipelineExecutor` result BUT maybe NOT to preserve pure JSON object
 */
