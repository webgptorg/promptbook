import { spaceTrim } from 'spacetrim';
import type { Promisable, ReadonlyDeep } from 'type-fest';
import { DEFAULT_CSV_SETTINGS } from '../../config';
import { IS_VERBOSE } from '../../config';
import { MAX_EXECUTION_ATTEMPTS } from '../../config';
import { MAX_PARALLEL_COUNT } from '../../config';
import { validatePipeline } from '../../conversion/validation/validatePipeline';
import { isPipelinePrepared } from '../../prepare/isPipelinePrepared';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TaskProgress } from '../../types/TaskProgress';
import type { Parameters } from '../../types/typeAliases';
import type { PipelineExecutor } from '../PipelineExecutor';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
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
    const { pipeline, tools, settings = {} } = options;
    const {
        maxExecutionAttempts = MAX_EXECUTION_ATTEMPTS,
        maxParallelCount = MAX_PARALLEL_COUNT,
        csvSettings = DEFAULT_CSV_SETTINGS,
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

    let preparedPipeline: ReadonlyDeep<PipelineJson>;

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

    let runCount = 0;

    const pipelineExecutor: PipelineExecutor = async (
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
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
            settings: {
                maxExecutionAttempts,
                maxParallelCount,
                csvSettings,
                isVerbose,
                isNotPreparedWarningSupressed,
            },
        });
    };

    return pipelineExecutor;
}
