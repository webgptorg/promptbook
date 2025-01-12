import { spaceTrim } from 'spacetrim';
import { DEFAULT_MAX_PARALLEL_COUNT } from '../config';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { forEachAsync } from '../execution/utils/forEachAsync';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../pipeline/PipelineJson/TaskJson';
import { TODO_USE } from '../utils/organization/TODO_USE';
import type { PrepareAndScrapeOptions } from './PrepareAndScrapeOptions';

type PrepareTaskInput = Pick<PipelineJson, 'tasks' | 'parameters'> & {
    /**
     * @@@
     */
    readonly knowledgePiecesCount: number;
};

type PreparedTasks = {
    /**
     * @@@ Sequence of tasks that are chained together to form a pipeline
     */
    readonly tasksPrepared: ReadonlyArray<TaskJson>;
};

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function prepareTasks(
    pipeline: PrepareTaskInput,
    tools: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
    options: PrepareAndScrapeOptions,
): Promise<PreparedTasks> {
    const { maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT } = options;
    const { tasks, parameters, knowledgePiecesCount } = pipeline;

    // TODO: [main] Apply examples to each task (if missing and is for the task defined)
    TODO_USE(parameters);

    // TODO: [🖌][🧠] Implement some `mapAsync` function
    const tasksPrepared: Array<TaskJson> = new Array(tasks.length);
    await forEachAsync(
        tasks,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (task, index) => {
            let { /* preparedContent <- TODO: Maybe use [🧊] */ dependentParameterNames } = task;
            let preparedContent: string | undefined = undefined;

            if (knowledgePiecesCount > 0 && !dependentParameterNames.includes('knowledge')) {
                preparedContent = spaceTrim(`
                    {content}

                    ## Knowledge

                    {knowledge}
                `);
                // <- TODO: [🧠][🧻] Cutomize shape/language/formatting of the addition to the prompt

                dependentParameterNames = [
                    ...dependentParameterNames,
                    'knowledge',
                    // <- [🏷] There is the reverse process to remove {knowledge} from `dependentParameterNames`
                ];
            }

            const preparedTask: TaskJson = {
                ...task,
                dependentParameterNames,
                preparedContent,
                // <- TODO: [🍙] Make some standard order of json properties
            };

            tasksPrepared[index] = preparedTask;
        },
    );

    return { tasksPrepared };
}

/**
 * TODO: [😂] Adding knowledge should be convert to async high-level abstractions, simmilar thing with expectations to sync high-level abstractions
 * TODO: [🧠] Add context to each task (if missing)
 * TODO: [🧠] What is better name `prepareTask` or `prepareTaskAndParameters`
 * TODO: [♨][main] !!3 Prepare index the examples and maybe tasks
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
