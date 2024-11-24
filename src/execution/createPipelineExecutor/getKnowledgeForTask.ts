import type { ReadonlyDeep } from 'type-fest';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_markdown } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @private internal type of `getKnowledgeFoTask`
 */
type GetKnowledgeForTaskOptions = {
    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly task: ReadonlyDeep<TaskJson>;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getKnowledgeForTask(
    options: GetKnowledgeForTaskOptions,
): Promise<string_parameter_value & string_markdown> {
    const { preparedPipeline, task } = options;

    // TODO: [♨] Implement Better - use real index and keyword search from `task` and {examples}

    TODO_USE(task);
    return preparedPipeline.knowledgePieces.map(({ content }) => `- ${content}`).join('\n');
    //                                                      <- TODO: [🧠] Some smart aggregation of knowledge pieces, single-line vs multi-line vs mixed
}
