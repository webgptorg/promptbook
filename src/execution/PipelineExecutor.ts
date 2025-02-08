import type { InputParameters } from '../types/typeAliases';
import { ExecutionTask } from './ExecutionTask';

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
        inputParameters: InputParameters
    ): Promise<ExecutionTask>;
};

/**
 * TODO: [🧠] Should this file be in /execution or /types folder?
 */
