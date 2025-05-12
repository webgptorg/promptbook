import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import {
    RESERVED_PARAMETER_MISSING_VALUE,
    RESERVED_PARAMETER_NAMES,
    RESERVED_PARAMETER_RESTRICTED,
} from '../../constants';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { Parameters, ReservedParameters } from '../../types/typeAliases';
import type { ExecutionTools } from '../ExecutionTools';
import { getContextForTask } from './getContextForTask';
import { getExamplesForTask } from './getExamplesForTask';
import { getKnowledgeForTask } from './getKnowledgeForTask';

/**
 * Options for retrieving reserved parameters for a pipeline task, including context, pipeline, and identification.
 *
 * @private internal type of `getReservedParametersForTask`
 */
type GetReservedParametersForTaskOptions = {
    /**
     * The execution tools to be used during the execution of the pipeline
     */
    readonly tools: ExecutionTools;

    /**
     * The prepared and validated pipeline in which the task resides.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * The task for which reserved parameters are being retrieved.
     */
    readonly task: ReadonlyDeep<TaskJson>;
    //       <- TODO: [🕉] `task` vs `currentTask` - unite naming

    /**
     * Parameters to complete the content of the task for embedding and context.
     */
    readonly parameters: Readonly<Parameters>;

    /**
     * String identifier for the pipeline, used in error messages and reporting.
     */
    readonly pipelineIdentification: string;
};

/**
 * Retrieves all reserved parameters for a given pipeline task, including context, knowledge, examples, and metadata.
 * Ensures all reserved parameters are defined and throws if any are missing.
 *
 * @param options - Options including tools, pipeline, task, and context.
 * @returns An object containing all reserved parameters for the task.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getReservedParametersForTask(
    options: GetReservedParametersForTaskOptions,
): Promise<Readonly<ReservedParameters>> {
    const { tools, preparedPipeline, task, parameters, pipelineIdentification } = options;

    console.log('!!! getReservedParametersForTask', options);

    const context = await getContextForTask(task); // <- [🏍]
    const knowledge = await getKnowledgeForTask({ tools, preparedPipeline, task, parameters });
    const examples = await getExamplesForTask(task);
    const currentDate = new Date().toISOString(); // <- TODO: [🧠][💩] Better
    const modelName = RESERVED_PARAMETER_MISSING_VALUE;

    const reservedParameters: ReservedParameters = {
        content: RESERVED_PARAMETER_RESTRICTED,
        context, // <- [🏍]
        knowledge,
        examples,
        currentDate,
        modelName,
    };

    // Note: Doublecheck that ALL reserved parameters are defined:
    for (const parameterName of RESERVED_PARAMETER_NAMES) {
        if (reservedParameters[parameterName] === undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Reserved parameter {${parameterName}} is not defined

                        ${block(pipelineIdentification)}
                    `,
                ),
            );
        }
    }

    return reservedParameters;
}
