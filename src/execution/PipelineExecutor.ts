import type { Promisable } from 'type-fest';
import type { TaskProgress } from '../types/TaskProgress';
import type { Parameters } from '../types/typeAliases';
import type { PipelineExecutorResult } from './PipelineExecutorResult';

/**
 * Executor is a simple async function that takes INPUT  PARAMETERs and returns result parameters _(along with all intermediate parameters and INPUT  PARAMETERs = it extends input object)_.
 * Executor is made by combining execution tools and pipeline collection.
 *
 * It can be created with `createPipelineExecutor` function.
 *
 * @see https://github.com/webgptorg/promptbook#executor
 */
export type PipelineExecutor = {
    (
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PipelineExecutorResult>;
};

/**
 * TODO: [🐚] Change onProgress to object that represents the running execution, can be subscribed via RxJS to and also awaited
 * TODO: [🧠] Should this file be in /execution or /types folder?
 */
