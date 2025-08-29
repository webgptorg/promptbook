import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep } from 'type-fest';
import {
    DEFAULT_CSV_SETTINGS,
    DEFAULT_INTERMEDIATE_FILES_STRATEGY,
    DEFAULT_IS_AUTO_INSTALLED,
    DEFAULT_IS_VERBOSE,
    DEFAULT_MAX_EXECUTION_ATTEMPTS,
    DEFAULT_MAX_PARALLEL_COUNT,
    DEFAULT_SCRAPE_CACHE_DIRNAME,
} from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { isPipelinePrepared } from '../../prepare/isPipelinePrepared';

import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { InputParameters, number_percent } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import type { ExecutionTask } from '../ExecutionTask';
import { createTask } from '../ExecutionTask';
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

    const pipelineExecutor: PipelineExecutor = (inputParameters: InputParameters): ExecutionTask =>
        createTask<PipelineExecutorResult>({
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

                    // Calculate progress based on pipeline tasks
                    const totalTasks = pipeline.tasks.length;
                    let completedTasks = 0;
                    let currentTaskName = '';

                    // Check execution report for completed tasks
                    if (cv?.executionReport?.promptExecutions) {
                        const executedTaskTitles = new Set(
                            cv.executionReport.promptExecutions.map((execution) => execution.prompt.title),
                        );

                        // Count completed tasks by matching titles
                        const completedTasksByTitle = pipeline.tasks.filter((task) =>
                            executedTaskTitles.has(task.title),
                        );
                        completedTasks = completedTasksByTitle.length;

                        // Find current task being executed (first task not yet completed)
                        const remainingTasks = pipeline.tasks.filter((task) => !executedTaskTitles.has(task.title));
                        if (remainingTasks.length > 0) {
                            currentTaskName = remainingTasks[0]!.name;
                        }
                    }

                    // Calculate progress percentage
                    let percent = totalTasks > 0 ? completedTasks / totalTasks : 0;

                    // Add time-based progress for current task (assuming 5 minutes total)
                    if (completedTasks < totalTasks) {
                        const elapsedMs = new Date().getTime() - new Date().getTime(); // Will be overridden by actual elapsed time in task
                        const totalMs = 5 * 60 * 1000; // 5 minutes
                        const timeProgress = Math.min(elapsedMs / totalMs, 1);

                        // Add partial progress for current task
                        percent += (1 / totalTasks) * timeProgress;
                    }

                    // Clamp to [0,1]
                    percent = Math.min(Math.max(percent, 0), 1);

                    // Generate message
                    let message = '';
                    if (currentTaskName) {
                        // Find the task to get its title
                        const currentTask = pipeline.tasks.find((task) => task.name === currentTaskName);
                        const taskTitle = currentTask?.title || currentTaskName;
                        message = `Working on task ${taskTitle}`;
                    } else if (completedTasks === 0) {
                        message = 'Starting pipeline execution';
                    } else {
                        message = `Processing pipeline (${completedTasks}/${totalTasks} tasks completed)`;
                    }

                    updateTldr({
                        percent: percent as number_percent,
                        message,
                    });
                });
            },
        }) as ExecutionTask;
    //        <- TODO: Make types such as there is no need to do `as` for `createTask`

    return pipelineExecutor;
}
