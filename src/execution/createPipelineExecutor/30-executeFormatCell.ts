import type { ReadonlyDeep } from 'type-fest';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * @@@
 *
 * @private internal type of `executeFormatCell`
 */
type ExecuteFormatCellOptions = {
    /**
     * @@@
     */
    preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    template: ReadonlyDeep<TemplateJson>;

    /**
     * @@@
     */
    pipelineIdentification: string;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeFormatCell(options: ExecuteFormatCellOptions): TODO_any {
    const { preparedPipeline, template, pipelineIdentification } = options;
}
