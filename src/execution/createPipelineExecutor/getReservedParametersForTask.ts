import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { RESERVED_PARAMETER_MISSING_VALUE } from '../../constants';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { RESERVED_PARAMETER_RESTRICTED } from '../../constants';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { ReservedParameters } from '../../types/typeAliases';
import { getContextForTask } from './getContextForTask';
import { getExamplesForTask } from './getExamplesForTask';
import { getKnowledgeForTask } from './getKnowledgeForTask';
import type { ExecutionTools } from '../ExecutionTools';

/**
 * @@@
 *
 * @private internal type of `getReservedParametersForTask`
 */
type GetReservedParametersForTaskOptions = {
    /**
     * The execution tools to be used during the execution of the pipeline
     */
    readonly tools: ExecutionTools;

    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly task: ReadonlyDeep<TaskJson>;

    /**
     * @@@
     */
    readonly pipelineIdentification: string;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getReservedParametersForTask(
    options: GetReservedParametersForTaskOptions,
): Promise<Readonly<ReservedParameters>> {
    const { tools, preparedPipeline, task, pipelineIdentification } = options;

    const context = await getContextForTask(task); // <- [🏍]
    const knowledge = await getKnowledgeForTask({ tools, preparedPipeline, task });
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
