import type { ReadonlyDeep } from 'type-fest';
import { RESERVED_PARAMETER_MISSING_VALUE } from '../../constants';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_markdown, string_parameter_value } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * Returns the context for a given task, typically used to provide additional information or variables
 * required for the execution of the task within a pipeline. The context is returned as a string value
 * that may include markdown formatting.
 *
 * @param task - The task for which the context is being generated. This should be a deeply immutable TaskJson object.
 * @returns The context as a string, formatted as markdown and parameter value.
 * @private internal utility of `createPipelineExecutor`
 */
export async function getContextForTask(
    task: ReadonlyDeep<TaskJson>,
): Promise<string_parameter_value & string_markdown> {
    TODO_USE(task);
    return RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [🏍] Implement */;
}
