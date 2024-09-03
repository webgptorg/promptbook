import type { ReadonlyDeep } from 'type-fest';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { keepUnused } from '../../utils/organization/keepUnused';

/**
 * @@@
 *
 * @private internal type of `executeFormatCell`
 */
type ExecuteFormatCellOptions = {
    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly template: ReadonlyDeep<TemplateJson>;

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
export async function executeFormatCell(options: ExecuteFormatCellOptions): Promise<TODO_any> {
    const { preparedPipeline, template, pipelineIdentification } = options;
    keepUnused(preparedPipeline, template, pipelineIdentification);
}
