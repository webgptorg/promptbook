import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep } from 'type-fest';
import { DEFAULT_CSV_SETTINGS } from '../../config';
import { DEFAULT_INTERMEDIATE_FILES_STRATEGY } from '../../config';
import { DEFAULT_IS_AUTO_INSTALLED } from '../../config';
import { DEFAULT_IS_VERBOSE } from '../../config';
import { DEFAULT_MAX_EXECUTION_ATTEMPTS } from '../../config';
import { DEFAULT_MAX_PARALLEL_COUNT } from '../../config';
import { DEFAULT_SCRAPE_CACHE_DIRNAME } from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { isPipelinePrepared } from '../../prepare/isPipelinePrepared';

import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { InputParameters } from '../../types/typeAliases';
import type { number_percent } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import type { ExecutionTask } from '../ExecutionTask';
import { createTask } from '../ExecutionTask';
import type { LlmCall } from '../../types/LlmCall';
import type { PipelineExecutor } from '../PipelineExecutor';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { UNCERTAIN_USAGE } from '../utils/usage-constants';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executePipeline } from './10-executePipeline';

/**
 * Creates executor function from pipeline and execution tools.
 *
 * @returns The executor function
 * @throws {PipelineLogicError} on logical error in the pipeline
 * @public exported from `@promptbook/core`
 */
export function createPipelineExecutor(options: CreatePipelineExecutorOptions): PipelineExecutor {
    const {
        pipeline,
        tools,
        maxExecutionAttempts = DEFAULT_MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT,
        csvSettings = DEFAULT_CSV_SETTINGS,
        isVerbose = DEFAULT_IS_VERBOSE,
        isNotPreparedWarningSuppressed = false,
        cacheDirname = DEFAULT_SCRAPE_CACHE_DIRNAME,
        intermediateFilesStrategy = DEFAULT_INTERMEDIATE_FILES_STRATEGY,
        isAutoInstalled = DEFAULT_IS_AUTO_INSTALLED,

        rootDirname = null,
    } = options;

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

    let preparedPipeline: ReadonlyDeep<PipelineJson>;

    if (isPipelinePrepared(pipeline)) {
        preparedPipeline = pipeline;
    } else if (isNotPreparedWarningSuppressed !== true) {
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
        // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
    }

    let runCount = 0;

    const pipelineExecutorWithCallback = async (
        inputParameters: InputParameters,
        onProgress?: (newOngoingResult: PartialDeep<PipelineExecutorResult>) => Promisable<void>,
        logLlmCall?: (llmCall: LlmCall) => Promisable<void>,
    ): Promise<PipelineExecutorResult> => {
        runCount++;

        return /* not await */ executePipeline({
            pipeline,
            preparedPipeline,
            setPreparedPipeline: (newPreparedPipeline) => {
                preparedPipeline = newPreparedPipeline;
            },
            inputParameters,
            tools,
            onProgress,
            logLlmCall,
            pipelineIdentification: spaceTrim(
                (block) => `
                    ${block(pipelineIdentification)}
                    ${runCount === 1 ? '' : `Run #${runCount}`}
                `,
            ),
            maxExecutionAttempts,
            maxParallelCount,
            csvSettings,
            isVerbose,
            isNotPreparedWarningSuppressed,
            rootDirname,
            cacheDirname,
            intermediateFilesStrategy,
            isAutoInstalled,
        }).catch((error) => {
            assertsError(error);

            return exportJson({
                name: 'pipelineExecutorResult',
                message: `Unsuccessful PipelineExecutorResult, last catch`,
                order: [],
                value: {
                    isSuccessful: false as const,
                    errors: [serializeError(error)],
                    warnings: [],
                    usage: UNCERTAIN_USAGE,
                    executionReport: null,
                    outputParameters: {},
                    preparedPipeline,
                },
            }) satisfies PipelineExecutorResult;
        });
    };

    const pipelineExecutor: PipelineExecutor = (inputParameters: InputParameters): ExecutionTask => {
        const startTime = new Date().getTime();

        return createTask<PipelineExecutorResult>({
            taskType: 'EXECUTION',
            title: pipeline.title,
            taskProcessCallback(
                updateOngoingResult: (newOngoingResult: PartialDeep<PipelineExecutorResult>) => void,
                updateTldr: (tldrInfo: { readonly percent: number_percent; readonly message: string }) => void,
            ) {
                return pipelineExecutorWithCallback(inputParameters, async (newOngoingResult) => {
                    updateOngoingResult(newOngoingResult);

                    // Calculate and update tldr based on pipeline progress
                    const cv = newOngoingResult as PartialDeep<PipelineExecutorResult>;

                    // Calculate progress based on parameters resolved vs total parameters
                    const totalParameters = pipeline.parameters.filter((p) => !p.isInput).length;
                    let resolvedParameters = 0;
                    let currentTaskTitle = '';

                    // Get the resolved parameters from output parameters
                    if (cv?.outputParameters) {
                        // Count how many output parameters have non-empty values
                        resolvedParameters = Object.values(cv.outputParameters).filter(
                            (value) => value !== undefined && value !== null && String(value).trim() !== '',
                        ).length;
                    }

                    // Try to determine current task from execution report
                    if (cv?.executionReport?.promptExecutions && cv.executionReport.promptExecutions.length > 0) {
                        const lastExecution =
                            cv.executionReport.promptExecutions[cv.executionReport.promptExecutions.length - 1];
                        if (lastExecution?.prompt?.title) {
                            currentTaskTitle = lastExecution.prompt.title;
                        }
                    }

                    // Calculate base progress percentage
                    let percent = totalParameters > 0 ? resolvedParameters / totalParameters : 0;

                    // Add time-based progress for current task if we haven't completed all parameters
                    if (resolvedParameters < totalParameters) {
                        const elapsedMs = new Date().getTime() - startTime;
                        const estimatedTotalMs = totalParameters * 30 * 1000; // Estimate 30 seconds per parameter
                        const timeProgress = Math.min(elapsedMs / estimatedTotalMs, 0.9); // Cap at 90% for time-based progress

                        // If we have time progress but no parameter progress, show time progress
                        if (percent === 0 && timeProgress > 0) {
                            percent = Math.min(timeProgress, 0.1); // Show some progress but not more than 10%
                        } else if (percent < 1) {
                            // Add partial progress for current task
                            const taskProgress = totalParameters > 0 ? (1 / totalParameters) * 0.5 : 0; // 50% of task progress
                            percent = Math.min(percent + taskProgress, 0.95); // Cap at 95% until fully complete
                        }
                    }

                    // Clamp to [0,1]
                    percent = Math.min(Math.max(percent, 0), 1);

                    // Generate message
                    let message = '';
                    if (currentTaskTitle) {
                        message = `Executing: ${currentTaskTitle}`;
                    } else if (resolvedParameters === 0) {
                        message = 'Starting pipeline execution';
                    } else if (resolvedParameters < totalParameters) {
                        message = `Processing pipeline (${resolvedParameters}/${totalParameters} parameters resolved)`;
                    } else {
                        message = 'Completing pipeline execution';
                    }

                    updateTldr({
                        percent: percent as number_percent,
                        message,
                    });
                });
            },
        }) as ExecutionTask;
    };
    //        <- TODO: Make types such as there is no need to do `as` for `createTask`

    return pipelineExecutor;
}
