import { spaceTrim } from 'spacetrim';
import type { Promisable, ReadonlyDeep } from 'type-fest';
import { forTime } from 'waitasecond';
import { IMMEDIATE_TIME } from '../../config';
import { LOOP_LIMIT } from '../../config';
import { RESERVED_PARAMETER_NAMES } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { serializeError } from '../../errors/utils/serializeError';
import { joinLlmExecutionTools } from '../../llm-providers/multiple/joinLlmExecutionTools';
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
import type { ExecutionTools } from '../ExecutionTools';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { addUsage } from '../utils/addUsage';
import { ZERO_USAGE } from '../utils/addUsage';
import type { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';
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
    readonly inputParameters: Readonly<Parameters>;

    /**
     * @@@
     */
    readonly tools: ExecutionTools;

    /**
     * @@@
     */
    onProgress?(taskProgress: TaskProgress): Promisable<void>;

    /**
     * @@@
     */
    readonly pipeline: PipelineJson;

    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly setPreparedPipeline: (preparedPipeline: ReadonlyDeep<PipelineJson>) => void;

    /**
     * @@@
     */
    readonly pipelineIdentification: string;

    /**
     * Settings for the pipeline executor
     */
    readonly settings: CreatePipelineExecutorSettings;
};

/**
 * @@@
 *
 * Note: This is not a `PipelineExecutor` (which is binded with one exact pipeline), but a utility function of `createPipelineExecutor` which creates `PipelineExecutor`
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executePipeline(options: ExecutePipelineOptions): Promise<PipelineExecutorResult> {
    const { inputParameters, tools, onProgress, pipeline, setPreparedPipeline, pipelineIdentification, settings } =
        options;
    const { maxParallelCount, isVerbose } = settings;
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
                    settings,
                    $executionReport: executionReport,
                    pipelineIdentification: spaceTrim(
                        (block) => `
                            ${block(pipelineIdentification)}
                            Template name: ${currentTemplate.name}
                            Template title: ${currentTemplate.title}
                        `,
                    ),
                })
                    .then((newParametersToPass) => {
                        parametersToPass = { ...newParametersToPass, ...parametersToPass };
                        resovedParameterNames = [...resovedParameterNames, currentTemplate.resultingParameterName];
                    })
                    .then(() => {
                        resolving = resolving.filter((w) => w !== work);
                    });
                // <- Note: Errors are catched here [3]
                //    TODO: BUT if in multiple templates are errors, only the first one is catched so maybe we should catch errors here and save them to errors array here

                resolving.push(work);
            }
        }

        await Promise.all(resolving);
    } catch (error /* <- Note: [3] */) {
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
