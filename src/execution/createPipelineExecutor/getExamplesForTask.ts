import type { ReadonlyDeep } from 'type-fest';
import { RESERVED_PARAMETER_MISSING_VALUE } from '../../config';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_markdown } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getExamplesForTask(
    task: ReadonlyDeep<TaskJson>,
): Promise<string_parameter_value & string_markdown> {
    // TODO: [♨] Implement Better - use real index and keyword search

    TODO_USE(task);
    return RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [♨] Implement */;
}
